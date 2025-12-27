// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IERC6538Registry
/// @notice Interface for ERC-6538 stealth meta-address registry
interface IERC6538Registry {
    /// @notice Emitted when a stealth meta-address is registered
    /// @param registrant The address registering the meta-address
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthMetaAddress The stealth meta-address (spending + viewing pubkeys)
    event StealthMetaAddressSet(
        address indexed registrant,
        uint256 indexed schemeId,
        bytes stealthMetaAddress
    );

    /// @notice Register or update a stealth meta-address
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthMetaAddress The stealth meta-address (66 bytes for secp256k1)
    function registerKeys(uint256 schemeId, bytes calldata stealthMetaAddress) external;

    /// @notice Get a registrant's stealth meta-address
    /// @param registrant The address to query
    /// @param schemeId The stealth address scheme
    /// @return The stealth meta-address (empty if not registered)
    function stealthMetaAddressOf(
        address registrant,
        uint256 schemeId
    ) external view returns (bytes memory);
}
