// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title GaleonPrivacyPoolComplex
 * @author Galeon (adapted from 0xbow privacy-pools-core)
 * @notice ERC20 implementation of Privacy Pool with UUPS upgradeability
 * @dev Original: packages/0xbow/packages/contracts/src/contracts/implementations/PrivacyPoolComplex.sol
 *
 * MODIFICATIONS FROM 0xbow:
 * - Changed pragma from 0.8.28 to ^0.8.24 (Hardhat compatibility)
 * - Changed imports to Hardhat-style (node_modules)
 * - Added UUPS upgradeability (Initializable, UUPSUpgradeable, OwnableUpgradeable)
 * - Added owner-only admin functions for verifier upgrades and registry setting
 * - Added Galeon branding
 */

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {IERC20} from "@openzeppelin/contracts/interfaces/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {Constants} from "./lib/Constants.sol";

import {GaleonPrivacyPool} from "./GaleonPrivacyPool.sol";
import {IGaleonPrivacyPoolComplex} from "./interfaces/IGaleonPrivacyPool.sol";

/**
 * @title GaleonPrivacyPoolComplex
 * @notice ERC20 implementation of Privacy Pool
 * @dev UUPS upgradeable for future circuit upgrades and bug fixes
 */
contract GaleonPrivacyPoolComplex is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    GaleonPrivacyPool,
    IGaleonPrivacyPoolComplex
{
    using SafeERC20 for IERC20;

    // ============ Constructor ============

    /**
     * @notice Disable initializers in implementation contract
     * @dev 0xbow original: PrivacyPoolComplex constructor
     * @dev GALEON MODIFICATION: Added _disableInitializers() for UUPS pattern
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _entrypoint,
        address _withdrawalVerifier,
        address _ragequitVerifier,
        address _asset
    ) GaleonPrivacyPool(_entrypoint, _withdrawalVerifier, _ragequitVerifier, _asset) {
        // @dev 0xbow original: PrivacyPoolComplex constructor line 41
        if (_asset == Constants.NATIVE_ASSET) revert NativeAssetNotSupported();
        _disableInitializers();
    }

    // ============ Initializer ============

    /**
     * @notice Initialize the privacy pool (called once via proxy)
     * @dev GALEON ADDITION: Replaces 0xbow constructor for UUPS pattern
     * @param _owner Contract owner (can upgrade and set registry)
     * @param _entrypoint Address of the Entrypoint contract
     * @param _withdrawalVerifier Address of the withdrawal proof verifier
     * @param _ragequitVerifier Address of the ragequit proof verifier
     * @param _galeonRegistry GaleonRegistry address for Port verification
     */
    function initialize(
        address _owner,
        address _entrypoint,
        address _withdrawalVerifier,
        address _ragequitVerifier,
        address _galeonRegistry
    ) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        // Initialize non-immutable state for proxy
        _initializeState(_entrypoint, _withdrawalVerifier, _ragequitVerifier);
        circuitVersion = 1;

        // Set Galeon Registry for Port-only deposits
        if (_galeonRegistry != address(0)) {
            _setGaleonRegistry(_galeonRegistry);
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Upgrade verifiers for new circuit versions
     * @dev GALEON ADDITION: Owner-only function to swap verifiers
     * @param _newWithdrawalVerifier New withdrawal verifier address
     * @param _newRagequitVerifier New ragequit verifier address
     */
    function upgradeVerifiers(
        address _newWithdrawalVerifier,
        address _newRagequitVerifier
    ) external onlyOwner {
        _upgradeVerifiers(_newWithdrawalVerifier, _newRagequitVerifier);
    }

    /**
     * @notice Set the Galeon Registry for Port verification
     * @dev GALEON ADDITION: Owner-only function to set registry
     * @param _registry GaleonRegistry address
     */
    function setGaleonRegistry(address _registry) external onlyOwner {
        _setGaleonRegistry(_registry);
    }

    /**
     * @notice Update deposit blocklist for ASP compliance
     * @dev GALEON ADDITION: Owner-only function to block/unblock depositors
     * @param _depositor Address to block/unblock
     * @param _blocked True to block, false to unblock
     */
    function updateBlocklist(address _depositor, bool _blocked) external onlyOwner {
        _updateBlocklist(_depositor, _blocked);
    }

    // ============ Asset Handling ============

    /**
     * @notice Handle pulling an ERC20 asset
     * @dev 0xbow original: PrivacyPoolComplex._pull
     * @param _sender The address of the user transferring the asset from
     * @param _amount The amount of asset being pulled
     * @inheritdoc GaleonPrivacyPool
     */
    function _pull(address _sender, uint256 _amount) internal override(GaleonPrivacyPool) {
        // This contract does not accept native asset
        // @dev 0xbow original: PrivacyPoolComplex._pull line 52
        if (msg.value != 0) revert NativeAssetNotAccepted();

        // Pull asset from sender to this contract
        // @dev 0xbow original: PrivacyPoolComplex._pull line 55
        IERC20(ASSET).safeTransferFrom(_sender, address(this), _amount);
    }

    /**
     * @notice Handle sending an ERC20 asset
     * @dev 0xbow original: PrivacyPoolComplex._push
     * @param _recipient The address of the user receiving the asset
     * @param _amount The amount of asset being sent
     * @inheritdoc GaleonPrivacyPool
     */
    function _push(address _recipient, uint256 _amount) internal override(GaleonPrivacyPool) {
        // Send asset from this contract to recipient
        // @dev 0xbow original: PrivacyPoolComplex._push line 66
        IERC20(ASSET).safeTransfer(_recipient, _amount);
    }

    // ============ UUPS Upgrade Authorization ============

    /**
     * @notice Authorize UUPS upgrade
     * @dev GALEON ADDITION: Only owner can upgrade
     */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
