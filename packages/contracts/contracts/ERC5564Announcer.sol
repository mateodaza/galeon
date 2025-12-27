// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title ERC-5564 Announcer
/// @notice Standard implementation for stealth address announcements
/// @dev Includes trusted relayer system to prevent announcement spoofing
contract ERC5564Announcer is Ownable {
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

    /// @notice Emitted when a trusted relayer is added or removed
    event TrustedRelayerUpdated(address indexed relayer, bool trusted);

    /// @notice Mapping of addresses trusted to call announceFor
    mapping(address => bool) public trustedRelayers;

    constructor() Ownable(msg.sender) {}

    /// @notice Add or remove a trusted relayer
    /// @param relayer The address to update
    /// @param trusted Whether the address should be trusted
    function setTrustedRelayer(address relayer, bool trusted) external onlyOwner {
        trustedRelayers[relayer] = trusted;
        emit TrustedRelayerUpdated(relayer, trusted);
    }

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
    ) external {
        emit Announcement(schemeId, stealthAddress, msg.sender, ephemeralPubKey, metadata);
    }

    /// @notice Announce a stealth payment on behalf of another address
    /// @dev Only callable by trusted relayers (e.g., GaleonRegistry) to prevent spoofing
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
    ) external {
        require(trustedRelayers[msg.sender], "Not a trusted relayer");
        emit Announcement(schemeId, stealthAddress, caller, ephemeralPubKey, metadata);
    }
}
