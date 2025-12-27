// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IERC5564Announcer.sol";
import "./interfaces/IERC6538Registry.sol";

/// @title GaleonRegistry
/// @notice Main Galeon contract: Port management, payments, and receipt anchoring
/// @dev Integrates with ERC-5564 and ERC-6538 contracts
contract GaleonRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    /// @notice Stealth address scheme ID (1 = secp256k1 with view tags)
    uint256 public constant SCHEME_ID = 1;

    // ============ Immutables ============

    /// @notice ERC-5564 Announcer contract
    IERC5564Announcer public immutable announcer;

    /// @notice ERC-6538 Registry contract
    IERC6538Registry public immutable registry;

    // ============ Events ============

    /// @notice Emitted when a receipt hash is anchored on-chain
    event ReceiptAnchored(
        address indexed stealthAddress,
        bytes32 indexed receiptHash,
        address indexed payer,
        uint256 amount,
        address token, // address(0) for native
        uint256 timestamp
    );

    /// @notice Emitted when a new Port is registered
    event PortRegistered(
        address indexed owner,
        bytes32 indexed portId,
        string name,
        bytes stealthMetaAddress
    );

    /// @notice Emitted when a Port is deactivated
    event PortDeactivated(address indexed owner, bytes32 indexed portId);

    // ============ State ============

    /// @notice Port ID => stealth meta-address
    mapping(bytes32 => bytes) public portMetaAddresses;

    /// @notice Port ID => owner address
    mapping(bytes32 => address) public portOwners;

    /// @notice Port ID => active status
    mapping(bytes32 => bool) public portActive;

    // ============ Constructor ============

    /// @param _announcer Address of ERC-5564 Announcer
    /// @param _registry Address of ERC-6538 Registry
    constructor(address _announcer, address _registry) {
        require(_announcer != address(0), "Invalid announcer");
        require(_registry != address(0), "Invalid registry");
        announcer = IERC5564Announcer(_announcer);
        registry = IERC6538Registry(_registry);
    }

    // ============ Port Management ============

    /// @notice Register a new Port
    /// @param portId Unique identifier for the Port (keccak256 of name + random)
    /// @param name Human-readable name for the Port
    /// @param stealthMetaAddress The Port's stealth meta-address (66 bytes)
    function registerPort(
        bytes32 portId,
        string calldata name,
        bytes calldata stealthMetaAddress
    ) external {
        require(portOwners[portId] == address(0), "Port already exists");
        require(stealthMetaAddress.length == 66, "Invalid meta-address length");

        portMetaAddresses[portId] = stealthMetaAddress;
        portOwners[portId] = msg.sender;
        portActive[portId] = true;

        // Note: ERC6538 registration removed - it would register under GaleonRegistry's
        // address, not the user's. Users can call ERC6538Registry directly if needed.

        emit PortRegistered(msg.sender, portId, name, stealthMetaAddress);
    }

    /// @notice Deactivate a Port (owner only)
    /// @param portId The Port to deactivate
    function deactivatePort(bytes32 portId) external {
        require(portOwners[portId] == msg.sender, "Not port owner");
        require(portActive[portId], "Port already inactive");

        portActive[portId] = false;
        emit PortDeactivated(msg.sender, portId);
    }

    /// @notice Get a Port's stealth meta-address
    /// @param portId The Port to query
    /// @return The stealth meta-address (empty if not found)
    function getPortMetaAddress(bytes32 portId) external view returns (bytes memory) {
        return portMetaAddresses[portId];
    }

    // ============ Native Payments ============

    /// @notice Pay native currency (MNT/ETH) to a stealth address
    /// @param stealthAddress The stealth address to pay
    /// @param ephemeralPubKey The ephemeral public key (33 bytes compressed)
    /// @param viewTag Single byte view tag for efficient scanning
    /// @param receiptHash Hash of the off-chain receipt (for verification)
    function payNative(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes32 receiptHash
    ) external payable nonReentrant {
        require(msg.value > 0, "No value sent");
        require(stealthAddress != address(0), "Invalid stealth address");
        require(ephemeralPubKey.length == 33, "Invalid ephemeral key length");
        require(
            ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03,
            "Invalid pubkey prefix"
        );

        // Transfer native currency to stealth address
        (bool success, ) = stealthAddress.call{value: msg.value}("");
        require(success, "Native transfer failed");

        // Build metadata: viewTag (1 byte) + receiptHash (32 bytes)
        bytes memory metadata = abi.encodePacked(viewTag, receiptHash);

        // Announce via canonical contract (with actual payer as caller)
        announcer.announceFor(SCHEME_ID, stealthAddress, msg.sender, ephemeralPubKey, metadata);

        // Emit receipt anchor event
        emit ReceiptAnchored(
            stealthAddress,
            receiptHash,
            msg.sender,
            msg.value,
            address(0),
            block.timestamp
        );
    }

    // ============ Token Payments ============

    /// @notice Pay ERC-20 tokens to a stealth address
    /// @param token The ERC-20 token contract
    /// @param stealthAddress The stealth address to pay
    /// @param amount The amount of tokens to pay
    /// @param ephemeralPubKey The ephemeral public key (33 bytes compressed)
    /// @param viewTag Single byte view tag for efficient scanning
    /// @param receiptHash Hash of the off-chain receipt (for verification)
    function payToken(
        address token,
        address stealthAddress,
        uint256 amount,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes32 receiptHash
    ) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(stealthAddress != address(0), "Invalid stealth address");
        require(token != address(0), "Invalid token");
        require(ephemeralPubKey.length == 33, "Invalid ephemeral key length");
        require(
            ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03,
            "Invalid pubkey prefix"
        );

        // Transfer tokens to stealth address
        IERC20(token).safeTransferFrom(msg.sender, stealthAddress, amount);

        // Build metadata: viewTag (1) + receiptHash (32) + token (20) + amount (32)
        bytes memory metadata = abi.encodePacked(viewTag, receiptHash, token, amount);

        // Announce via canonical contract (with actual payer as caller)
        announcer.announceFor(SCHEME_ID, stealthAddress, msg.sender, ephemeralPubKey, metadata);

        // Emit receipt anchor event
        emit ReceiptAnchored(
            stealthAddress,
            receiptHash,
            msg.sender,
            amount,
            token,
            block.timestamp
        );
    }
}
