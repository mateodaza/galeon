// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title GaleonPrivacyPoolSimple
 * @author Galeon (adapted from 0xbow privacy-pools-core)
 * @notice Native asset (MNT) implementation of Privacy Pool with UUPS upgradeability
 * @dev Original: packages/0xbow/packages/contracts/src/contracts/implementations/PrivacyPoolSimple.sol
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

import {Constants} from "./lib/Constants.sol";

import {GaleonPrivacyPool} from "./GaleonPrivacyPool.sol";
import {IGaleonPrivacyPoolSimple} from "./interfaces/IGaleonPrivacyPool.sol";

/**
 * @title GaleonPrivacyPoolSimple
 * @notice Native asset (MNT on Mantle) implementation of Privacy Pool
 * @dev UUPS upgradeable for future circuit upgrades and bug fixes
 */
contract GaleonPrivacyPoolSimple is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    GaleonPrivacyPool,
    IGaleonPrivacyPoolSimple
{
    // ============ Constructor ============

    /**
     * @notice Disable initializers in implementation contract
     * @dev 0xbow original: PrivacyPoolSimple constructor
     * @dev GALEON MODIFICATION: Added _disableInitializers() for UUPS pattern
     */
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _entrypoint,
        address _withdrawalVerifier,
        address _ragequitVerifier
    ) GaleonPrivacyPool(_entrypoint, _withdrawalVerifier, _ragequitVerifier, Constants.NATIVE_ASSET) {
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
     * @notice Handle receiving native asset
     * @dev 0xbow original: PrivacyPoolSimple._pull
     * @param _amount The amount of native asset receiving
     * @inheritdoc GaleonPrivacyPool
     */
    function _pull(address, uint256 _amount) internal override(GaleonPrivacyPool) {
        // Check the amount matches the value sent
        // @dev 0xbow original: PrivacyPoolSimple._pull line 43
        if (msg.value != _amount) revert InsufficientValue();
    }

    /**
     * @notice Handle sending native asset
     * @dev 0xbow original: PrivacyPoolSimple._push
     * @param _recipient The address of the user receiving the asset
     * @param _amount The amount of native asset being sent
     * @inheritdoc GaleonPrivacyPool
     */
    function _push(address _recipient, uint256 _amount) internal override(GaleonPrivacyPool) {
        // Try to send native asset to recipient
        // @dev 0xbow original: PrivacyPoolSimple._push line 54
        (bool _success,) = _recipient.call{value: _amount}("");
        if (!_success) revert FailedToSendNativeAsset();
    }

    // ============ UUPS Upgrade Authorization ============

    /**
     * @notice Authorize UUPS upgrade
     * @dev GALEON ADDITION: Only owner can upgrade
     */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
