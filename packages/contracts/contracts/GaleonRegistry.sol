// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IERC5564Announcer.sol";
import "./interfaces/IERC6538Registry.sol";

/// @title GaleonRegistry
/// @notice Main Galeon contract: Port management, payments, and receipt anchoring
/// @dev Integrates with ERC-5564 and ERC-6538 contracts
contract GaleonRegistry is ReentrancyGuard, Ownable {
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

    /// @notice Emitted when verified balance is consumed by Privacy Pool
    event VerifiedBalanceConsumed(
        address indexed stealthAddress,
        address indexed asset,
        uint256 amount,
        address indexed consumer
    );

    /// @notice Emitted when a Privacy Pool is authorized/deauthorized
    event PrivacyPoolAuthorized(address indexed pool, bool authorized);

    /// @notice Emitted when a stealth address is frozen/unfrozen
    event StealthAddressFrozen(address indexed stealthAddress, bool frozen);

    // ============ State ============

    /// @notice Port ID => stealth meta-address
    mapping(bytes32 => bytes) public portMetaAddresses;

    /// @notice Port ID => owner address
    mapping(bytes32 => address) public portOwners;

    /// @notice Port ID => active status
    mapping(bytes32 => bool) public portActive;

    /// @notice Track stealth addresses that received payments through Ports
    /// @dev Used by Privacy Pool to enforce Port-only deposits
    mapping(address => bool) public isPortStealthAddress;

    /// @notice Track which Port a stealth address received payment through
    /// @dev Used for compliance tracking and ASP filtering
    mapping(address => bytes32) public stealthAddressToPort;

    /// @notice Track verified balance per address per asset (funds received via Port payments)
    /// @dev verifiedBalance[stealthAddress][asset] - asset is address(0) for native currency
    /// @dev Only verified funds can be deposited to Privacy Pool - prevents dirty direct sends
    mapping(address => mapping(address => uint256)) private _verifiedBalance;

    /// @notice Track which Privacy Pool contracts are authorized to consume verified balances
    /// @dev Only authorized pools can call consumeVerifiedBalance
    mapping(address => bool) public authorizedPools;

    /// @notice Track frozen stealth addresses (cannot deposit to Privacy Pool)
    /// @dev Used when ports are deactivated or for compliance freezes
    mapping(address => bool) public frozenStealthAddresses;

    // ============ Constructor ============

    /// @param _announcer Address of ERC-5564 Announcer
    /// @param _registry Address of ERC-6538 Registry
    constructor(address _announcer, address _registry) Ownable(msg.sender) {
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

    /// @notice Pay native currency (MNT/ETH) to a stealth address via a Port
    /// @param portId The Port receiving this payment
    /// @param stealthAddress The stealth address to pay
    /// @param ephemeralPubKey The ephemeral public key (33 bytes compressed)
    /// @param viewTag Single byte view tag for efficient scanning
    /// @param receiptHash Hash of the off-chain receipt (for verification)
    function payNative(
        bytes32 portId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes32 receiptHash
    ) external payable nonReentrant {
        require(msg.value > 0, "No value sent");
        require(stealthAddress != address(0), "Invalid stealth address");
        require(portActive[portId], "Port not active");
        require(ephemeralPubKey.length == 33, "Invalid ephemeral key length");
        require(
            ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03,
            "Invalid pubkey prefix"
        );

        // Transfer native currency to stealth address
        (bool success, ) = stealthAddress.call{value: msg.value}("");
        require(success, "Native transfer failed");

        // Mark stealth address as valid for Privacy Pool deposits
        isPortStealthAddress[stealthAddress] = true;
        stealthAddressToPort[stealthAddress] = portId;

        // Increment verified balance for Privacy Pool deposit gating (address(0) = native)
        _verifiedBalance[stealthAddress][address(0)] += msg.value;

        // Build metadata: viewTag (1 byte) + receiptHash (32 bytes) + portId (32 bytes)
        bytes memory metadata = abi.encodePacked(viewTag, receiptHash, portId);

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

    /// @notice Pay ERC-20 tokens to a stealth address via a Port
    /// @param portId The Port receiving this payment
    /// @param token The ERC-20 token contract
    /// @param stealthAddress The stealth address to pay
    /// @param amount The amount of tokens to pay
    /// @param ephemeralPubKey The ephemeral public key (33 bytes compressed)
    /// @param viewTag Single byte view tag for efficient scanning
    /// @param receiptHash Hash of the off-chain receipt (for verification)
    function payToken(
        bytes32 portId,
        address token,
        address stealthAddress,
        uint256 amount,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag,
        bytes32 receiptHash
    ) external nonReentrant {
        require(amount > 0, "Zero amount");
        require(stealthAddress != address(0), "Invalid stealth address");
        require(portActive[portId], "Port not active");
        require(token != address(0), "Invalid token");
        require(ephemeralPubKey.length == 33, "Invalid ephemeral key length");
        require(
            ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03,
            "Invalid pubkey prefix"
        );

        // Transfer tokens to stealth address
        IERC20(token).safeTransferFrom(msg.sender, stealthAddress, amount);

        // Mark stealth address as valid for Privacy Pool deposits
        isPortStealthAddress[stealthAddress] = true;
        stealthAddressToPort[stealthAddress] = portId;

        // Increment verified balance for Privacy Pool deposit gating (token address as asset)
        _verifiedBalance[stealthAddress][token] += amount;

        // Build metadata: viewTag (1) + receiptHash (32) + portId (32) + token (20) + amount (32)
        bytes memory metadata = abi.encodePacked(viewTag, receiptHash, portId, token, amount);

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

    // ============ Privacy Pool Integration ============
    //
    // DEPLOYMENT NOTE: After deploying a Privacy Pool, you MUST call:
    //   registry.setAuthorizedPool(poolAddress, true)
    // Otherwise deposits will revert with "Not authorized pool".
    //
    // The owner should be a controlled ops key or timelock to prevent
    // unauthorized pool authorization attacks.

    /// @notice Authorize or deauthorize a Privacy Pool to consume verified balances
    /// @dev Only owner can authorize pools
    /// @dev IMPORTANT: Must be called for each pool before deposits work
    /// @param _pool The Privacy Pool address
    /// @param _authorized True to authorize, false to deauthorize
    function setAuthorizedPool(address _pool, bool _authorized) external onlyOwner {
        require(_pool != address(0), "Invalid pool address");
        authorizedPools[_pool] = _authorized;
        emit PrivacyPoolAuthorized(_pool, _authorized);
    }

    /// @notice Get the verified balance for an address and asset
    /// @param _address The stealth address to query
    /// @param _asset The asset address (address(0) for native currency)
    /// @return The verified balance that can be deposited to the Privacy Pool
    function verifiedBalance(address _address, address _asset) external view returns (uint256) {
        return _verifiedBalance[_address][_asset];
    }

    /// @notice Consume verified balance when depositing to Privacy Pool
    /// @dev Only callable by authorized Privacy Pools - prevents double-deposits and dirty sends
    /// @param _address The address whose balance to consume
    /// @param _asset The asset address (address(0) for native currency)
    /// @param _amount The amount to consume
    function consumeVerifiedBalance(address _address, address _asset, uint256 _amount) external {
        require(authorizedPools[msg.sender], "Not authorized pool");
        require(_verifiedBalance[_address][_asset] >= _amount, "Insufficient verified balance");

        _verifiedBalance[_address][_asset] -= _amount;
        emit VerifiedBalanceConsumed(_address, _asset, _amount, msg.sender);
    }

    // ============ Stealth Address Freezing ============
    //
    // Use this to freeze stealth addresses when ports are deactivated
    // or for compliance reasons. Frozen addresses cannot deposit to Privacy Pool.

    /// @notice Freeze or unfreeze a stealth address
    /// @dev Only owner can freeze addresses - use when port is deactivated or for compliance
    /// @param _stealthAddress The stealth address to freeze/unfreeze
    /// @param _frozen True to freeze, false to unfreeze
    function setFrozenStealthAddress(address _stealthAddress, bool _frozen) external onlyOwner {
        frozenStealthAddresses[_stealthAddress] = _frozen;
        emit StealthAddressFrozen(_stealthAddress, _frozen);
    }

    /// @notice Check if a stealth address can deposit (is valid Port address AND not frozen)
    /// @param _address The address to check
    /// @return True if the address can deposit to Privacy Pool
    function canDeposit(address _address) external view returns (bool) {
        return isPortStealthAddress[_address] && !frozenStealthAddresses[_address];
    }
}
