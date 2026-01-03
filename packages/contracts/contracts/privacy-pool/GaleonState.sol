// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title GaleonState
 * @author Galeon (adapted from 0xbow privacy-pools-core)
 * @notice Base contract for managing the state of a Galeon Privacy Pool
 * @dev Original: packages/0xbow/packages/contracts/src/contracts/State.sol
 *
 * MODIFICATIONS FROM 0xbow:
 * - Changed pragma from 0.8.28 to ^0.8.24 (Hardhat compatibility)
 * - Changed imports to Hardhat-style (node_modules)
 * - Made verifiers non-immutable for UUPS upgradeability
 * - Made SCOPE non-immutable for correct per-proxy values (proof domain separation)
 * - Added Galeon branding
 */

import {InternalLeanIMT, LeanIMTData} from "@zk-kit/lean-imt.sol/InternalLeanIMT.sol";
import {PoseidonT4} from "poseidon-solidity/PoseidonT4.sol";

import {Constants} from "./lib/Constants.sol";
import {IGaleonEntrypoint} from "./interfaces/IGaleonEntrypoint.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IGaleonState} from "./interfaces/IGaleonState.sol";

/**
 * @title GaleonState
 * @notice Manages Merkle tree state, nullifiers, and depositor tracking
 */
abstract contract GaleonState is IGaleonState {
    using InternalLeanIMT for LeanIMTData;

    // ============ Constants ============
    // @dev 0xbow original: ROOT_HISTORY_SIZE = 64, MAX_TREE_DEPTH = 32

    /// @inheritdoc IGaleonState
    uint32 public constant ROOT_HISTORY_SIZE = 64;

    /// @inheritdoc IGaleonState
    uint32 public constant MAX_TREE_DEPTH = 32;

    // ============ Immutables ============
    // @dev 0xbow original: ASSET, SCOPE are immutable
    // @dev GALEON: SCOPE made non-immutable for correct per-proxy values

    /// @inheritdoc IGaleonState
    /// @custom:oz-upgrades-unsafe-allow state-variable-immutable
    address public immutable ASSET;

    /// @inheritdoc IGaleonState
    /// @dev Non-immutable to allow correct per-proxy SCOPE computation
    uint256 public SCOPE;

    // ============ State (GALEON MODIFICATION: non-immutable for upgrades) ============
    // @dev 0xbow original: ENTRYPOINT, WITHDRAWAL_VERIFIER, RAGEQUIT_VERIFIER are immutable
    // @dev GALEON: Made non-immutable to support UUPS upgradeability and verifier swapping

    /// @notice Entrypoint contract reference
    IGaleonEntrypoint public ENTRYPOINT;

    /// @notice Withdrawal proof verifier
    IVerifier public WITHDRAWAL_VERIFIER;

    /// @notice Ragequit proof verifier
    IVerifier public RAGEQUIT_VERIFIER;

    /// @inheritdoc IGaleonState
    uint256 public nonce;

    /// @inheritdoc IGaleonState
    bool public dead;

    /// @inheritdoc IGaleonState
    mapping(uint256 _index => uint256 _root) public roots;

    /// @inheritdoc IGaleonState
    uint32 public currentRootIndex;

    /// @notice The state merkle tree containing all commitments
    /// @dev Uses LeanIMT from @zk-kit for Poseidon-based incremental Merkle tree
    LeanIMTData internal _merkleTree;

    /// @inheritdoc IGaleonState
    mapping(uint256 _nullifierHash => bool _spent) public nullifierHashes;

    /// @inheritdoc IGaleonState
    mapping(uint256 _label => address _depositor) public depositors;

    // ============ Modifiers ============

    /**
     * @notice Check the caller is the Entrypoint
     * @dev 0xbow original: identical
     */
    modifier onlyEntrypoint() {
        if (msg.sender != address(ENTRYPOINT)) revert OnlyEntrypoint();
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the state addresses
     * @dev 0xbow original: packages/0xbow/packages/contracts/src/contracts/State.sol:79-94
     * @dev GALEON MODIFICATION: Verifiers stored as state vars, not immutables
     */
    constructor(
        address _asset,
        address _entrypoint,
        address _withdrawalVerifier,
        address _ragequitVerifier
    ) {
        // Sanitize initial addresses
        if (_asset == address(0)) revert ZeroAddress();
        if (_entrypoint == address(0)) revert ZeroAddress();
        if (_ragequitVerifier == address(0)) revert ZeroAddress();
        if (_withdrawalVerifier == address(0)) revert ZeroAddress();

        // Store asset address (immutable)
        ASSET = _asset;

        // NOTE: SCOPE is computed in _initializeState() for correct per-proxy values
        // For direct deployment (not proxy), constructor should call _initializeState()
        // or set SCOPE directly here. In UUPS pattern, proxies call initialize().

        // Set non-immutable state (also needs to be set in initializer for proxies)
        ENTRYPOINT = IGaleonEntrypoint(_entrypoint);
        WITHDRAWAL_VERIFIER = IVerifier(_withdrawalVerifier);
        RAGEQUIT_VERIFIER = IVerifier(_ragequitVerifier);

        // Compute SCOPE for implementation contract (proxies will override in initialize)
        SCOPE = uint256(keccak256(abi.encodePacked(address(this), block.chainid, _asset))) % Constants.SNARK_SCALAR_FIELD;
    }

    /**
     * @notice Initialize non-immutable state for UUPS proxies
     * @dev GALEON ADDITION: Called from child contract initializers
     * @dev For UUPS proxies, the constructor sets values in implementation storage,
     *      but proxy storage needs to be initialized via this function
     * @dev IMPORTANT: SCOPE must be computed here (not constructor) to use proxy's address
     * @param _entrypoint Address of the Entrypoint contract
     * @param _withdrawalVerifier Address of the withdrawal proof verifier
     * @param _ragequitVerifier Address of the ragequit proof verifier
     */
    function _initializeState(
        address _entrypoint,
        address _withdrawalVerifier,
        address _ragequitVerifier
    ) internal {
        if (_entrypoint == address(0)) revert ZeroAddress();
        if (_withdrawalVerifier == address(0)) revert ZeroAddress();
        if (_ragequitVerifier == address(0)) revert ZeroAddress();

        ENTRYPOINT = IGaleonEntrypoint(_entrypoint);
        WITHDRAWAL_VERIFIER = IVerifier(_withdrawalVerifier);
        RAGEQUIT_VERIFIER = IVerifier(_ragequitVerifier);

        // Compute SCOPE using proxy's address (address(this) in delegatecall context)
        // This ensures each proxy has a unique SCOPE for proof domain separation
        // @dev 0xbow original formula: keccak256(address, chainid, asset) % SNARK_SCALAR_FIELD
        SCOPE = uint256(keccak256(abi.encodePacked(address(this), block.chainid, ASSET))) % Constants.SNARK_SCALAR_FIELD;
    }

    // ============ View Functions ============

    /// @inheritdoc IGaleonState
    function currentRoot() external view returns (uint256 _root) {
        _root = _merkleTree._root();
    }

    /// @inheritdoc IGaleonState
    function currentTreeDepth() external view returns (uint256 _depth) {
        _depth = _merkleTree.depth;
    }

    /// @inheritdoc IGaleonState
    function currentTreeSize() external view returns (uint256 _size) {
        _size = _merkleTree.size;
    }

    // ============ Internal Functions ============

    /**
     * @notice Spends a nullifier hash
     * @dev 0xbow original: packages/0xbow/packages/contracts/src/contracts/State.sol:119-129
     * @param _nullifierHash The nullifier hash to spend
     */
    function _spend(uint256 _nullifierHash) internal {
        // Check if the nullifier is already spent
        if (nullifierHashes[_nullifierHash]) revert NullifierAlreadySpent();

        // Mark as spent
        nullifierHashes[_nullifierHash] = true;
    }

    /**
     * @notice Insert a leaf into the state Merkle tree
     * @dev 0xbow original: packages/0xbow/packages/contracts/src/contracts/State.sol:131-152
     * @param _leaf The leaf (commitment) to insert
     * @return _updatedRoot The new root after inserting the leaf
     */
    function _insert(uint256 _leaf) internal returns (uint256 _updatedRoot) {
        // Insert leaf in the tree using LeanIMT
        _updatedRoot = _merkleTree._insert(_leaf);

        if (_merkleTree.depth > MAX_TREE_DEPTH) revert MaxTreeDepthReached();

        // Calculate the next index (circular buffer)
        uint32 nextIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;

        // Store the root at the next index
        roots[nextIndex] = _updatedRoot;

        // Update currentRootIndex to point to the latest root
        currentRootIndex = nextIndex;

        emit LeafInserted(_merkleTree.size, _leaf, _updatedRoot);
    }

    /**
     * @notice Returns whether the root is a known root
     * @dev 0xbow original: packages/0xbow/packages/contracts/src/contracts/State.sol:154-173
     * @dev A circular buffer is used for root storage
     * @dev Optimized to start search from most recent roots
     * @param _root The root to check
     * @return Returns true if the root exists in the history
     */
    function _isKnownRoot(uint256 _root) internal view returns (bool) {
        if (_root == 0) return false;

        // Start from the most recent root (current index)
        uint32 _index = currentRootIndex;

        // Check all possible roots in the history
        for (uint32 _i = 0; _i < ROOT_HISTORY_SIZE; _i++) {
            if (_root == roots[_index]) return true;
            _index = (_index + ROOT_HISTORY_SIZE - 1) % ROOT_HISTORY_SIZE;
        }
        return false;
    }

    /**
     * @notice Returns whether a leaf is in the state
     * @dev 0xbow original: packages/0xbow/packages/contracts/src/contracts/State.sol:175-182
     * @param _leaf The leaf to check
     * @return Returns true if the leaf exists in the tree
     */
    function _isInState(uint256 _leaf) internal view returns (bool) {
        return _merkleTree._has(_leaf);
    }
}
