// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title IGaleonEntrypoint
 * @author Galeon (adapted from 0xbow privacy-pools-core)
 * @notice Interface for the GaleonEntrypoint contract
 * @dev Original: packages/0xbow/packages/contracts/src/interfaces/IEntrypoint.sol
 *
 * MODIFICATIONS FROM 0xbow:
 * - Changed pragma from 0.8.28 to ^0.8.24 (Hardhat compatibility)
 * - Renamed IEntrypoint → IGaleonEntrypoint
 * - Renamed IPrivacyPool → IGaleonPrivacyPool
 * - Added Galeon branding
 * - Added IGaleonRegistry reference for Port verification
 */

import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";

import {ProofLib} from "../lib/ProofLib.sol";
import {IGaleonPrivacyPool} from "./IGaleonPrivacyPool.sol";

/**
 * @title IGaleonEntrypoint
 * @notice Interface for the Entrypoint contract - central access point for all Pool operations
 */
interface IGaleonEntrypoint {
    /*///////////////////////////////////////////////////////////////
                              STRUCTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Struct for the asset configuration
     * @dev 0xbow original: IEntrypoint.AssetConfig
     * @param pool The Privacy Pool contracts for the asset
     * @param minimumDepositAmount The minimum amount that can be deposited
     * @param vettingfeeBPS The deposit fee in basis points
     * @param maxRelayFeeBPS The maximum relay fee in basis points
     */
    struct AssetConfig {
        IGaleonPrivacyPool pool;
        uint256 minimumDepositAmount;
        uint256 vettingFeeBPS;
        uint256 maxRelayFeeBPS;
    }

    /**
     * @notice Struct for the relay data
     * @dev 0xbow original: IEntrypoint.RelayData
     * @param recipient The recipient of the funds withdrawn from the pool
     * @param feeRecipient The recipient of the fee
     * @param relayfeeBPS The relay fee in basis points
     */
    struct RelayData {
        address recipient;
        address feeRecipient;
        uint256 relayFeeBPS;
    }

    /**
     * @notice Struct for the onchain association set data
     * @dev 0xbow original: IEntrypoint.AssociationSetData
     * @param root The ASP root
     * @param ipfsCID The IPFS v1 CID of the ASP data
     * @param timestamp The timestamp on which the root was updated
     */
    struct AssociationSetData {
        uint256 root;
        string ipfsCID;
        uint256 timestamp;
    }

    /*///////////////////////////////////////////////////////////////
                              EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when pushing a new root to the association root set
     * @param _root The latest ASP root
     * @param _ipfsCID The IPFS CID of the association set data
     * @param _timestamp The timestamp of root update
     */
    event RootUpdated(uint256 _root, string _ipfsCID, uint256 _timestamp);

    /**
     * @notice Emitted when depositing into the pool
     * @param _depositor The address of the depositor
     * @param _pool The Privacy Pool contract
     * @param _commitment The commitment hash for the deposit
     * @param _amount The amount of asset deposited
     */
    event Deposited(address indexed _depositor, IGaleonPrivacyPool indexed _pool, uint256 _commitment, uint256 _amount);

    /**
     * @notice Emitted when merging a deposit into existing commitment
     * @dev GALEON ADDITION: For O(1) withdrawals
     * @param _depositor The address of the depositor
     * @param _pool The Privacy Pool contract
     * @param _newCommitment The new commitment hash (merged)
     * @param _amount The amount of asset deposited
     */
    event MergeDeposited(address indexed _depositor, IGaleonPrivacyPool indexed _pool, uint256 _newCommitment, uint256 _amount);

    /**
     * @notice Emitted when processing a withdrawal through the Entrypoint
     * @param _relayer The address of the relayer
     * @param _recipient The address of the withdrawal recipient
     * @param _asset The asset being withdrawn
     * @param _amount The amount of asset withdrawn
     * @param _feeAmount The fee paid to the relayer
     */
    event WithdrawalRelayed(
        address indexed _relayer, address indexed _recipient, IERC20 indexed _asset, uint256 _amount, uint256 _feeAmount
    );

    /**
     * @notice Emitted when withdrawing fees from the Entrypoint
     * @param _asset The asset being withdrawn
     * @param _recipient The address of the fees withdrawal recipient
     * @param _amount The amount of asset withdrawn
     */
    event FeesWithdrawn(IERC20 _asset, address _recipient, uint256 _amount);

    /**
     * @notice Emitted when winding down a Privacy Pool
     * @param _pool The Privacy Pool contract
     */
    event PoolWindDown(IGaleonPrivacyPool _pool);

    /**
     * @notice Emitted when registering a Privacy Pool in the Entrypoint registry
     * @param _pool The Privacy Pool contract
     * @param _asset The asset of the pool
     * @param _scope The unique scope of the pool
     */
    event PoolRegistered(IGaleonPrivacyPool _pool, IERC20 _asset, uint256 _scope);

    /**
     * @notice Emitted when removing a Privacy Pool from the Entrypoint registry
     * @param _pool The Privacy Pool contract
     * @param _asset The asset of the pool
     * @param _scope The unique scope of the pool
     */
    event PoolRemoved(IGaleonPrivacyPool _pool, IERC20 _asset, uint256 _scope);

    /**
     * @notice Emitted when updating the configuration of a Privacy Pool
     * @param _pool The Privacy Pool contract
     * @param _asset The asset of the pool
     * @param _newMinimumDepositAmount The updated minimum deposit amount
     * @param _newVettingFeeBPS The updated vetting fee in basis points
     * @param _newMaxRelayFeeBPS The updated maximum relay fee in basis points
     */
    event PoolConfigurationUpdated(
        IGaleonPrivacyPool _pool,
        IERC20 _asset,
        uint256 _newMinimumDepositAmount,
        uint256 _newVettingFeeBPS,
        uint256 _newMaxRelayFeeBPS
    );

    /*///////////////////////////////////////////////////////////////
                              ERRORS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Thrown when trying to withdraw an invalid amount
     */
    error InvalidWithdrawalAmount();

    /**
     * @notice Thrown when trying to access a non-existent pool
     */
    error PoolNotFound();

    /**
     * @notice Thrown when trying to register a dead pool
     */
    error PoolIsDead();

    /**
     * @notice Thrown when trying to register a pool whose configured Entrypoint is not this one
     */
    error InvalidEntrypointForPool();

    /**
     * @notice Thrown when trying to register a pool for an asset that is already present in the registry
     */
    error AssetPoolAlreadyRegistered();

    /**
     * @notice Thrown when trying to register a pool for a scope that is already present in the registry
     */
    error ScopePoolAlreadyRegistered();

    /**
     * @notice Thrown when trying to deposit less than the minimum deposit amount
     */
    error MinimumDepositAmount();

    /**
     * @notice Thrown when trying to relay with a relayer fee greater than the maximum configured
     */
    error RelayFeeGreaterThanMax();

    /**
     * @notice Thrown when trying to process a withdrawal with an invalid processooor
     */
    error InvalidProcessooor();

    /**
     * @notice Thrown when finding an invalid state in the pool like an invalid asset balance
     */
    error InvalidPoolState();

    /**
     * @notice Thrown when trying to push an IPFS CID with an invalid length
     */
    error InvalidIPFSCIDLength();

    /**
     * @notice Thrown when trying to push a root with an empty root
     */
    error EmptyRoot();

    /**
     * @notice Thrown when failing to send the native asset to an account
     */
    error NativeAssetTransferFailed();

    /**
     * @notice Thrown when an address parameter is zero
     */
    error ZeroAddress();

    /**
     * @notice Thrown when a fee in basis points is greater than 10000 (100%)
     */
    error InvalidFeeBPS();

    /**
     * @notice Thrown when trying to access an association set at an invalid index
     */
    error InvalidIndex();

    /**
     * @notice Thrown when trying to get the latest root when no roots exist
     */
    error NoRootsAvailable();

    /**
     * @notice Thrown when trying to register a pool with an asset that doesn't match the pool's asset
     */
    error AssetMismatch();

    /**
     * @notice Thrown when trying to send native asset to the Entrypoint
     */
    error NativeAssetNotAccepted();

    /**
     * @notice Thrown when trying to deposit using a precommitment that has already been used
     */
    error PrecommitmentAlreadyUsed();

    /*//////////////////////////////////////////////////////////////
                                LOGIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initializes the contract state
     * @param _owner The initial owner
     * @param _postman The initial postman (ASP root updater)
     */
    function initialize(address _owner, address _postman) external;

    /**
     * @notice Push a new root to the association root set
     * @param _root The new ASP root
     * @param _ipfsCID The IPFS v1 CID of the association set data
     * @return _index The index of the newly added root
     */
    function updateRoot(uint256 _root, string memory _ipfsCID) external returns (uint256 _index);

    /**
     * @notice Make a native asset deposit into the Privacy Pool
     * @param _precommitment The precommitment for the deposit
     * @return _commitment The deposit commitment hash
     */
    function deposit(uint256 _precommitment) external payable returns (uint256 _commitment);

    /**
     * @notice Make an ERC20 deposit into the Privacy Pool
     * @param _asset The asset to deposit
     * @param _value The amount of asset to deposit
     * @param _precommitment The precommitment for the deposit
     * @return _commitment The deposit commitment hash
     */
    function deposit(IERC20 _asset, uint256 _value, uint256 _precommitment) external returns (uint256 _commitment);

    /**
     * @notice Merge a native asset deposit into existing commitment
     * @dev GALEON ADDITION: Enables O(1) withdrawals
     * @param _mergeData Encoded merge deposit data for context
     * @param _proof The MergeDepositProof with ZK proof
     * @param _scope The Pool scope to merge into
     */
    function mergeDeposit(
        bytes calldata _mergeData,
        ProofLib.MergeDepositProof calldata _proof,
        uint256 _scope
    ) external payable;

    /**
     * @notice Process a withdrawal via relay
     * @param _withdrawal The `Withdrawal` struct
     * @param _proof The `WithdrawProof` struct containing the withdrawal proof signals
     * @param _scope The Pool scope to withdraw from
     */
    function relay(
        IGaleonPrivacyPool.Withdrawal calldata _withdrawal,
        ProofLib.WithdrawProof calldata _proof,
        uint256 _scope
    ) external;

    /**
     * @notice Register a Privacy Pool in the registry
     * @param _asset The asset of the pool
     * @param _pool The address of the Privacy Pool contract
     * @param _minimumDepositAmount The minimum deposit amount for the asset
     * @param _vettingFeeBPS The deposit fee in basis points
     * @param _maxRelayFeeBPS The maximum relay fee in basis points
     */
    function registerPool(
        IERC20 _asset,
        IGaleonPrivacyPool _pool,
        uint256 _minimumDepositAmount,
        uint256 _vettingFeeBPS,
        uint256 _maxRelayFeeBPS
    ) external;

    /**
     * @notice Remove a Privacy Pool from the registry
     * @param _asset The asset of the pool
     */
    function removePool(IERC20 _asset) external;

    /**
     * @notice Updates the configuration of a specific pool
     * @param _asset The asset of the pool to update
     * @param _minimumDepositAmount The new minimum deposit amount
     * @param _vettingFeeBPS The new vetting fee in basis points
     * @param _maxRelayFeeBPS The new max relay fee in basis points
     */
    function updatePoolConfiguration(
        IERC20 _asset,
        uint256 _minimumDepositAmount,
        uint256 _vettingFeeBPS,
        uint256 _maxRelayFeeBPS
    ) external;

    /**
     * @notice Irreversibly halt deposits from a Privacy Pool
     * @param _pool The Privacy Pool contract
     */
    function windDownPool(IGaleonPrivacyPool _pool) external;

    /**
     * @notice Withdraw fees from the Entrypoint
     * @param _asset The asset to withdraw
     * @param _recipient The recipient of the fees
     */
    function withdrawFees(IERC20 _asset, address _recipient) external;

    /*///////////////////////////////////////////////////////////////
                            VIEWS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Returns the configured pool for a scope
     * @param _scope The unique scope of the pool
     * @return _pool The Privacy Pool contract
     */
    function scopeToPool(uint256 _scope) external view returns (IGaleonPrivacyPool _pool);

    /**
     * @notice Returns the configuration for an asset
     * @param _asset The asset address
     * @return _pool The Privacy Pool contract
     * @return _minimumDepositAmount The minimum deposit amount
     * @return _vettingFeeBPS The deposit fee in basis points
     * @return _maxRelayFeeBPS The max relayer fee in basis points
     */
    function assetConfig(IERC20 _asset)
        external
        view
        returns (IGaleonPrivacyPool _pool, uint256 _minimumDepositAmount, uint256 _vettingFeeBPS, uint256 _maxRelayFeeBPS);

    /**
     * @notice Returns the association set data at an index
     * @param _index The index of the array
     * @return _root The updated ASP root
     * @return _ipfsCID The IPFS v1 CID for the association set data
     * @return _timestamp The timestamp of the root update
     */
    function associationSets(uint256 _index)
        external
        view
        returns (uint256 _root, string memory _ipfsCID, uint256 _timestamp);

    /**
     * @notice Returns the latest ASP root
     * @return _root The latest ASP root
     */
    function latestRoot() external view returns (uint256 _root);

    /**
     * @notice Returns an ASP root by index
     * @param _index The index
     * @return _root The ASP root at the index
     */
    function rootByIndex(uint256 _index) external view returns (uint256 _root);

    /**
     * @notice Returns a boolean indicating if the precommitment has been used
     * @param _precommitment The precommitment hash
     * @return _used The usage status
     */
    function usedPrecommitments(uint256 _precommitment) external view returns (bool _used);
}
