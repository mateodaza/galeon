// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IERC5564Announcer
/// @notice Interface for ERC-5564 stealth address announcements
interface IERC5564Announcer {
    /// @notice Emitted when a stealth payment is announced
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthAddress The generated stealth address receiving funds
    /// @param caller The address making the announcement (usually payer)
    /// @param ephemeralPubKey The ephemeral public key for deriving stealth address
    /// @param metadata Additional data (view tag, receipt hash, token info)
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    /// @notice Announce a stealth payment (caller = msg.sender)
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthAddress The stealth address receiving funds
    /// @param ephemeralPubKey The ephemeral public key (33 bytes compressed)
    /// @param metadata Additional data (view tag + optional data)
    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external;

    /// @notice Announce a stealth payment on behalf of another address
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthAddress The stealth address receiving funds
    /// @param caller The actual payer/caller to attribute
    /// @param ephemeralPubKey The ephemeral public key (33 bytes compressed)
    /// @param metadata Additional data (view tag + optional data)
    function announceFor(
        uint256 schemeId,
        address stealthAddress,
        address caller,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external;
}
