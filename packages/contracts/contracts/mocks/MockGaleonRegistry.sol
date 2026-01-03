// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IGaleonRegistry} from "../privacy-pool/interfaces/IGaleonRegistry.sol";

/**
 * @title MockGaleonRegistry
 * @notice Mock GaleonRegistry for testing Privacy Pool contracts
 * @dev Allows setting which addresses are valid Port stealth addresses
 */
contract MockGaleonRegistry is IGaleonRegistry {
    /// @notice Mapping of active ports
    mapping(bytes32 => bool) public portActive;

    /// @notice Mapping of port owners
    mapping(bytes32 => address) public portOwners;

    /// @notice Mapping of valid port stealth addresses
    mapping(address => bool) public isPortStealthAddress;

    /// @notice Mapping of stealth address to port ID
    mapping(address => bytes32) public stealthAddressToPort;

    /// @notice Track verified balance per address per asset
    /// @dev verifiedBalance[address][asset] - asset is address(0) for native
    mapping(address => mapping(address => uint256)) private _verifiedBalance;

    /// @notice Track which pools are authorized to consume balances
    mapping(address => bool) public authorizedPools;

    /// @notice Track frozen stealth addresses
    mapping(address => bool) public frozenStealthAddresses;

    /// @notice Set whether an address is a valid Port stealth address
    function setPortStealthAddress(address _address, bool _valid) external {
        isPortStealthAddress[_address] = _valid;
    }

    /// @notice Set the port ID for a stealth address
    function setStealthAddressPort(address _address, bytes32 _portId) external {
        stealthAddressToPort[_address] = _portId;
    }

    /// @notice Set port active status
    function setPortActive(bytes32 _portId, bool _active) external {
        portActive[_portId] = _active;
    }

    /// @notice Set port owner
    function setPortOwner(bytes32 _portId, address _owner) external {
        portOwners[_portId] = _owner;
    }

    /// @notice Set verified balance for testing
    function setVerifiedBalance(address _address, address _asset, uint256 _amount) external {
        _verifiedBalance[_address][_asset] = _amount;
    }

    /// @notice Authorize a pool to consume verified balances
    function setAuthorizedPool(address _pool, bool _authorized) external {
        authorizedPools[_pool] = _authorized;
    }

    /// @notice Get verified balance for an address and asset
    function verifiedBalance(address _address, address _asset) external view returns (uint256) {
        return _verifiedBalance[_address][_asset];
    }

    /// @notice Consume verified balance (only authorized pools)
    function consumeVerifiedBalance(address _address, address _asset, uint256 _amount) external {
        require(authorizedPools[msg.sender], "Not authorized pool");
        require(_verifiedBalance[_address][_asset] >= _amount, "Insufficient verified balance");
        _verifiedBalance[_address][_asset] -= _amount;
    }

    /// @notice Set frozen status for a stealth address
    function setFrozenStealthAddress(address _address, bool _frozen) external {
        frozenStealthAddresses[_address] = _frozen;
    }

    /// @notice Check if address can deposit (is Port stealth address AND not frozen)
    function canDeposit(address _address) external view returns (bool) {
        return isPortStealthAddress[_address] && !frozenStealthAddresses[_address];
    }
}
