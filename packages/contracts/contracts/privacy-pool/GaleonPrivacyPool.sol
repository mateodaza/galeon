// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title GaleonPrivacyPool
 * @author Galeon (adapted from 0xbow privacy-pools-core)
 * @notice Abstract contract for Privacy Pool - allows publicly depositing and privately withdrawing funds
 * @dev Original: packages/0xbow/packages/contracts/src/contracts/PrivacyPool.sol
 *
 * MODIFICATIONS FROM 0xbow:
 * - Changed pragma from 0.8.28 to ^0.8.24 (Hardhat compatibility)
 * - Changed imports to Hardhat-style (node_modules)
 * - Made verifiers non-immutable for UUPS upgradeability
 * - Added Port-only deposit restriction via GaleonRegistry
 * - Added deposit blocklist for ASP compliance
 * - Added verifier upgrade functionality
 * - Added Galeon branding
 */

import {PoseidonT4} from "poseidon-solidity/PoseidonT4.sol";

import {Constants} from "./lib/Constants.sol";
import {ProofLib} from "./lib/ProofLib.sol";

import {IGaleonPrivacyPool} from "./interfaces/IGaleonPrivacyPool.sol";
import {IGaleonRegistry} from "./interfaces/IGaleonRegistry.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";

import {GaleonState} from "./GaleonState.sol";

/**
 * @title GaleonPrivacyPool
 * @notice Allows publicly depositing and privately withdrawing funds
 * @dev Withdrawals require a valid proof of being approved by an ASP
 * @dev Deposits can be irreversibly suspended by the Entrypoint, while withdrawals can't
 */
abstract contract GaleonPrivacyPool is GaleonState, IGaleonPrivacyPool {
    using ProofLib for ProofLib.WithdrawProof;
    using ProofLib for ProofLib.RagequitProof;

    // ============ GALEON ADDITIONS ============

    /// @notice Reference to Galeon Registry for Port verification
    /// @dev GALEON ADDITION: Used to enforce Port-only deposits
    IGaleonRegistry public galeonRegistry;


    /// @notice Current circuit version (for tracking verifier upgrades)
    /// @dev GALEON ADDITION: Incremented when verifiers are upgraded
    uint256 public circuitVersion;

    /// @notice Deposit-time blocklist for ASP compliance
    /// @dev GALEON ADDITION: Blocked addresses cannot deposit (in addition to withdrawal-time ASP)
    mapping(address => bool) public blockedDepositors;

    // ============ GALEON EVENTS ============

    /// @notice Emitted when verifiers are upgraded
    /// @dev GALEON ADDITION
    event VerifiersUpgraded(address indexed withdrawalVerifier, address indexed ragequitVerifier, uint256 newVersion);

    /// @notice Emitted when GaleonRegistry is set
    /// @dev GALEON ADDITION
    event GaleonRegistrySet(address indexed registry);

    /// @notice Emitted when an address is added/removed from deposit blocklist
    /// @dev GALEON ADDITION
    event DepositorBlocklistUpdated(address indexed depositor, bool blocked);

    // ============ Modifiers ============

    /**
     * @notice Does a series of sanity checks on the proof public signals
     * @dev 0xbow original: PrivacyPool.validWithdrawal modifier
     * @param _withdrawal The withdrawal data structure containing withdrawal details
     * @param _proof The withdrawal proof data structure containing proof details
     */
    modifier validWithdrawal(Withdrawal memory _withdrawal, ProofLib.WithdrawProof memory _proof) {
        // Check caller is the allowed processooor
        if (msg.sender != _withdrawal.processooor) revert InvalidProcessooor();

        // Check the context matches to ensure its integrity
        // @dev 0xbow original: Context = keccak256(withdrawal, SCOPE) % SNARK_SCALAR_FIELD
        if (_proof.context() != uint256(keccak256(abi.encode(_withdrawal, SCOPE))) % Constants.SNARK_SCALAR_FIELD) {
            revert ContextMismatch();
        }

        // Check the tree depth signals are less than the max tree depth
        if (_proof.stateTreeDepth() > MAX_TREE_DEPTH || _proof.ASPTreeDepth() > MAX_TREE_DEPTH) {
            revert InvalidTreeDepth();
        }

        // Check the state root is known
        if (!_isKnownRoot(_proof.stateRoot())) revert UnknownStateRoot();

        // Check the ASP root is the latest
        if (_proof.ASPRoot() != ENTRYPOINT.latestRoot()) revert IncorrectASPRoot();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initializes the contract state addresses
     * @dev 0xbow original: PrivacyPool constructor
     * @param _entrypoint Address of the Entrypoint that operates this pool
     * @param _withdrawalVerifier Address of the Groth16 verifier for withdrawal proofs
     * @param _ragequitVerifier Address of the Groth16 verifier for ragequit proofs
     * @param _asset Address of the pool asset
     */
    constructor(
        address _entrypoint,
        address _withdrawalVerifier,
        address _ragequitVerifier,
        address _asset
    ) GaleonState(_asset, _entrypoint, _withdrawalVerifier, _ragequitVerifier) {
        circuitVersion = 1;
    }

    /*///////////////////////////////////////////////////////////////
                             USER METHODS
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IGaleonPrivacyPool
    function deposit(
        address _depositor,
        uint256 _value,
        uint256 _precommitmentHash
    ) external payable onlyEntrypoint returns (uint256 _commitment) {
        // Check deposits are enabled
        // @dev 0xbow original: PrivacyPool.deposit line 88
        if (dead) revert PoolIsDead();

        // @dev 0xbow original: PrivacyPool.deposit line 90
        if (_value >= type(uint128).max) revert InvalidDepositValue();

        // GALEON ADDITION: Check depositor is not on blocklist (deposit-time ASP)
        if (blockedDepositors[_depositor]) revert DepositorBlocked();

        // GALEON ADDITION: Require galeonRegistry to be set - prevents accidental bypass of deposit gating
        if (address(galeonRegistry) == address(0)) revert GaleonRegistryNotSet();

        // GALEON ADDITION: Verify depositor can deposit (is Port stealth address AND not frozen)
        // This restricts the anonymity set to only verified Port users (intentional for compliance)
        // Frozen addresses (from deactivated ports or compliance freezes) are rejected
        if (!galeonRegistry.canDeposit(_depositor)) revert MustDepositFromPort();

        // GALEON ADDITION: Check and consume verified balance to prevent dirty sends and double-deposits
        // Only funds received through Port payments can be deposited
        // Note: For native assets (NATIVE_ASSET = 0xEeee...), use address(0) in registry (ERC-7528 normalization)
        address registryAsset = ASSET == Constants.NATIVE_ASSET ? address(0) : ASSET;
        if (galeonRegistry.verifiedBalance(_depositor, registryAsset) < _value) {
            revert InsufficientVerifiedBalance();
        }
        galeonRegistry.consumeVerifiedBalance(_depositor, registryAsset, _value);

        // Compute label
        // @dev 0xbow original: PrivacyPool.deposit line 93
        uint256 _label = uint256(keccak256(abi.encodePacked(SCOPE, ++nonce))) % Constants.SNARK_SCALAR_FIELD;

        // Store depositor
        depositors[_label] = _depositor;

        // Compute commitment hash
        // @dev 0xbow original: Poseidon(value, label, precommitment)
        _commitment = PoseidonT4.hash([_value, _label, _precommitmentHash]);

        // Insert commitment in state (revert if already present)
        _insert(_commitment);

        // Pull funds from caller
        _pull(msg.sender, _value);

        emit Deposited(_depositor, _commitment, _label, _value, _precommitmentHash);
    }

    /// @inheritdoc IGaleonPrivacyPool
    function withdraw(
        Withdrawal memory _withdrawal,
        ProofLib.WithdrawProof memory _proof
    ) external validWithdrawal(_withdrawal, _proof) {
        // Verify proof with Groth16 verifier
        // @dev 0xbow original: PrivacyPool.withdraw line 115
        if (!WITHDRAWAL_VERIFIER.verifyProof(_proof.pA, _proof.pB, _proof.pC, _proof.pubSignals)) {
            revert InvalidProof();
        }

        // Mark existing commitment nullifier as spent
        _spend(_proof.existingNullifierHash());

        // Insert new commitment in state
        _insert(_proof.newCommitmentHash());

        // Transfer out funds to processooor
        _push(_withdrawal.processooor, _proof.withdrawnValue());

        emit Withdrawn(
            _withdrawal.processooor,
            _proof.withdrawnValue(),
            _proof.existingNullifierHash(),
            _proof.newCommitmentHash()
        );
    }

    /// @inheritdoc IGaleonPrivacyPool
    function ragequit(ProofLib.RagequitProof memory _proof) external {
        // Check if caller is original depositor
        // @dev 0xbow original: PrivacyPool.ragequit lines 133-135
        uint256 _label = _proof.label();
        if (depositors[_label] != msg.sender) revert OnlyOriginalDepositor();

        // Verify proof with Groth16 verifier
        if (!RAGEQUIT_VERIFIER.verifyProof(_proof.pA, _proof.pB, _proof.pC, _proof.pubSignals)) {
            revert InvalidProof();
        }

        // Check commitment exists in state
        if (!_isInState(_proof.commitmentHash())) revert InvalidCommitment();

        // Mark existing commitment nullifier as spent
        _spend(_proof.nullifierHash());

        // Transfer out funds to ragequitter
        _push(msg.sender, _proof.value());

        emit Ragequit(msg.sender, _proof.commitmentHash(), _proof.label(), _proof.value());
    }

    /*///////////////////////////////////////////////////////////////
                             WIND DOWN
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IGaleonPrivacyPool
    function windDown() external onlyEntrypoint {
        // Check pool is still alive
        // @dev 0xbow original: PrivacyPool.windDown line 159
        if (dead) revert PoolIsDead();

        // Die
        dead = true;

        emit PoolDied();
    }

    /*///////////////////////////////////////////////////////////////
                          ADMIN METHODS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set the Galeon Registry for Port verification
     * @dev GALEON ADDITION: Only callable by the Entrypoint
     * @param _registry The GaleonRegistry contract address
     */
    function _setGaleonRegistry(address _registry) internal {
        galeonRegistry = IGaleonRegistry(_registry);
        emit GaleonRegistrySet(_registry);
    }

    /**
     * @notice Upgrade the verifiers for new circuit versions
     * @dev GALEON ADDITION: Allows swapping verifiers for circuit upgrades
     * @param _newWithdrawalVerifier The new withdrawal verifier address
     * @param _newRagequitVerifier The new ragequit verifier address
     */
    function _upgradeVerifiers(
        address _newWithdrawalVerifier,
        address _newRagequitVerifier
    ) internal {
        require(_newWithdrawalVerifier != address(0), "Invalid withdrawal verifier");
        require(_newRagequitVerifier != address(0), "Invalid ragequit verifier");

        WITHDRAWAL_VERIFIER = IVerifier(_newWithdrawalVerifier);
        RAGEQUIT_VERIFIER = IVerifier(_newRagequitVerifier);
        circuitVersion++;

        emit VerifiersUpgraded(_newWithdrawalVerifier, _newRagequitVerifier, circuitVersion);
    }

    /**
     * @notice Update the deposit blocklist for ASP compliance
     * @dev GALEON ADDITION: Block/unblock addresses from depositing
     * @param _depositor The address to update
     * @param _blocked True to block, false to unblock
     */
    function _updateBlocklist(address _depositor, bool _blocked) internal {
        blockedDepositors[_depositor] = _blocked;
        emit DepositorBlocklistUpdated(_depositor, _blocked);
    }

    /*///////////////////////////////////////////////////////////////
                          ASSET OVERRIDES
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Handle receiving an asset
     * @dev To be implemented by an asset specific contract
     * @dev 0xbow original: PrivacyPool._pull
     * @param _sender The address of the user sending funds
     * @param _value The amount of asset being received
     */
    function _pull(address _sender, uint256 _value) internal virtual;

    /**
     * @notice Handle sending an asset
     * @dev To be implemented by an asset specific contract
     * @dev 0xbow original: PrivacyPool._push
     * @param _recipient The address of the user receiving funds
     * @param _value The amount of asset being sent
     */
    function _push(address _recipient, uint256 _value) internal virtual;
}
