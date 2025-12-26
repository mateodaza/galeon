# Galeon: Private Payments. Verifiable Proof.

## Mantle Global Hackathon 2025

**Project Name:** Galeon
**Tagline:** "Your payments. Your treasure. Hidden in plain sight."
**Team:** Mateo & Carlos (Barranquilla, Colombia)
**Submission Deadline:** January 15, 2026
**Hackathon:** [Mantle Global Hackathon 2025](https://www.hackquest.io/hackathons/Mantle-Global-Hackathon-2025)

---

## Core Concepts

### Ports (Payment Endpoints)

A **Port** is Galeon's core privacy primitive - a payment endpoint with its own unique stealth meta-address. Each Port provides **cryptographic isolation**: if one Port's viewing key is compromised, other Ports remain completely private.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              PORTS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  Each Port has:                                                          │
│  • Unique stealth meta-address (spending + viewing public keys)          │
│  • Unique spending key (to claim funds)                                  │
│  • Unique viewing key (to scan for payments)                             │
│  • Name/label (user-defined)                                             │
│  • Type (permanent, recurring, one-time, burner)                         │
│                                                                          │
│  PORT TYPES:                                                             │
│                                                                          │
│  1. PERMANENT    - Long-lived, for ongoing business payments             │
│     └─ Example: "Main Business", "Supplier Payments"                     │
│                                                                          │
│  2. RECURRING    - Scheduled/periodic payments from same payers          │
│     └─ Example: "Q1 2025 Invoices", "Monthly Subscriptions"              │
│                                                                          │
│  3. ONE-TIME     - Single expected payment, auto-archives after use      │
│     └─ Example: "Invoice #1234", "Project Alpha Payment"                 │
│                                                                          │
│  4. BURNER       - Disposable, for maximum privacy                       │
│     └─ Example: "Anonymous Donation", "Travel Expenses Trip X"           │
│                                                                          │
│  PRIVACY GUARANTEE:                                                      │
│  Compromising Port A's viewing key reveals NOTHING about Port B.         │
│  Each Port is cryptographically independent.                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Port Data Model

```typescript
// Port stored in database
interface Port {
  id: string                    // UUID
  ownerId: number               // FK to User
  portId: bytes32               // On-chain identifier (keccak256 of name + random)
  name: string                  // User-defined label
  type: 'permanent' | 'recurring' | 'one-time' | 'burner'

  // Stealth keys (encrypted at rest)
  spendingPrivateKey: string    // Encrypted with user's master key
  viewingPrivateKey: string     // Encrypted with user's master key
  stealthMetaAddress: string    // Public: spending pubkey + viewing pubkey

  // Metadata
  active: boolean
  archived: boolean
  createdAt: DateTime
  archivedAt: DateTime | null

  // Stats (denormalized for performance)
  totalReceived: string         // Total MNT/ETH received
  paymentCount: number
}

// Port creation flow
interface CreatePortRequest {
  name: string
  type: 'permanent' | 'recurring' | 'one-time' | 'burner'
}
```

### Dual Modes: Vendor & User

Galeon supports two modes with tailored analytics. The same wallet can operate in both modes.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          DUAL MODES                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │        VENDOR MODE          │  │         USER MODE           │       │
│  │      (Receive Payments)     │  │      (Send Payments)        │       │
│  ├─────────────────────────────┤  ├─────────────────────────────┤       │
│  │                             │  │                             │       │
│  │  PRIMARY ACTIONS:           │  │  PRIMARY ACTIONS:           │       │
│  │  • Create Ports             │  │  • Pay to any Port/address  │       │
│  │  • Share payment links      │  │  • Create expense Ports     │       │
│  │  • Collect funds            │  │  • Track spending           │       │
│  │  • View income              │  │  • Export reports           │       │
│  │                             │  │                             │       │
│  │  ANALYTICS:                 │  │  ANALYTICS:                 │       │
│  │  • Income by Port           │  │  • Spending by category     │       │
│  │  • Income by period         │  │  • Spending by Port         │       │
│  │  • Top payers               │  │  • Monthly budgets          │       │
│  │  • Payment frequency        │  │  • Payment history          │       │
│  │  • Tax reports (quarterly)  │  │  • Receipt organization     │       │
│  │  • Outstanding invoices     │  │  • Merchant breakdown       │       │
│  │                             │  │                             │       │
│  │  USE CASES:                 │  │  USE CASES:                 │       │
│  │  • Restaurants              │  │  • Regular consumers        │       │
│  │  • Freelancers              │  │  • Business expenses        │       │
│  │  • B2B suppliers            │  │  • Travel budgets           │       │
│  │  • E-commerce               │  │  • Anonymous donations      │       │
│  │                             │  │                             │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
│                                                                          │
│  NOTE: Same wallet can be both Vendor AND User simultaneously.          │
│  Mode is selected in dashboard, not mutually exclusive.                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Collection Flow (Claiming Funds)

"Collect" is the nautical-themed action for withdrawing funds from stealth addresses.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COLLECTION FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TERMINOLOGY: "Collect" (fits Galeon nautical theme)                     │
│                                                                          │
│  TWO COLLECTION MODES:                                                   │
│                                                                          │
│  1. COLLECT ALL (Primary CTA)                                            │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  [Collect All - 2.5 MNT available]                           │    │
│     │                                                               │    │
│     │  Scans ALL Ports, finds ALL unclaimed payments,               │    │
│     │  batches them into a single transaction.                      │    │
│     │                                                               │    │
│     │  Best for: Regular collection, simple UX                      │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  2. COLLECT BY PORT (Secondary, expandable)                              │
│     ┌──────────────────────────────────────────────────────────────┐    │
│     │  Select Ports to collect from:                                │    │
│     │                                                               │    │
│     │  [x] Main Business         1.2 MNT  (3 payments)              │    │
│     │  [x] Q4 Invoices           0.8 MNT  (1 payment)               │    │
│     │  [ ] Travel Budget         0.5 MNT  (2 payments)              │    │
│     │                                                               │    │
│     │  [Collect Selected - 2.0 MNT]                                 │    │
│     │                                                               │    │
│     │  Best for: Accounting separation, selective withdrawal        │    │
│     └──────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  TECHNICAL FLOW:                                                         │
│                                                                          │
│  1. Frontend requests scan for selected Ports                            │
│  2. Backend scans Announcements using each Port's viewing key            │
│  3. Backend returns list of claimable stealth addresses + amounts        │
│  4. Frontend displays preview                                            │
│  5. User confirms → Relayer executes batch withdraw                      │
│  6. Funds arrive at user's main wallet                                   │
│                                                                          │
│  GAS: Relayer pays gas (hackathon). Future: user pays or subscription.   │
│                                                                          │
│  BATCH LIMIT: Up to 10 stealth addresses per transaction.                │
│  If more, split into multiple transactions automatically.                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Architecture

### Design Decision: Own EIP-5564/6538 Copies + GaleonRegistry

We deploy **our own copies** of ERC-5564 and ERC-6538 contracts plus our custom **GaleonRegistry**.

**Why not canonical addresses?**
- Canonical contracts are NOT deployed on Mantle (verified: address is empty EOA)
- CREATE2 deployment to canonical addresses requires exact init code + salt (complex)
- No other EIP-5564 wallets exist on Mantle, so interop is not a concern
- We can request ScopeLift to deploy canonical contracts later if needed

**This approach:**
1. **Standards compliance** - Uses official EIP implementations (same code)
2. **Simple deployment** - Standard `deploy()`, no CREATE2 complexity
3. **Self-contained** - Our system works fully without external dependencies
4. **Future-proof** - Can migrate to canonical addresses later if needed

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CONTRACT ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  GALEON CONTRACTS (Our deployments, EIP-compliant):                      │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ERC5564Announcer                                                │    │
│  │  Address: Deployed per chain (updated after deployment)          │    │
│  │                                                                  │    │
│  │  • Emits Announcement events for stealth payments                │    │
│  │  • Recipients scan these to find their payments                  │    │
│  │  • Standard EIP-5564 interface                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                           │                                              │
│                           │ calls                                        │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  ERC6538Registry                                                 │    │
│  │  Address: Deployed per chain (updated after deployment)          │    │
│  │                                                                  │    │
│  │  • Stores stealth meta-addresses by registrant + schemeId        │    │
│  │  • Standard ERC-6538 interface                                   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                           │                                              │
│                           │ calls                                        │
│                           ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  GaleonRegistry (Galeon-specific)                                │    │
│  │  Address: Deployed per chain (updated after deployment)          │    │
│  │                                                                  │    │
│  │  FEATURES:                                                       │    │
│  │  • Port registration (links portId → stealthMetaAddress)         │    │
│  │  • Single-tx payment (transfer + announce in one call)           │    │
│  │  • Receipt hash anchoring (on-chain proof of payment)            │    │
│  │  • Native MNT/ETH and ERC-20 support                             │    │
│  │  • Batch operations for collection                               │    │
│  │                                                                  │    │
│  │  CALLS:                                                          │    │
│  │  • announcer.announce() - on every payment                       │    │
│  │  • registry.registerKeys() - on Port creation                    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Chain Configuration

```typescript
// packages/contracts/config/chains.ts

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  contracts: {
    announcer: `0x${string}`
    registry: `0x${string}`
    galeon: `0x${string}`
  }
}

// Supported chains - addresses updated after deployment
export const chains: Record<number, ChainConfig> = {
  // Mantle Sepolia (Testnet) - Primary for hackathon
  5003: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorer: 'https://sepolia.mantlescan.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
    contracts: {
      announcer: '0x...', // TODO: Update after deployment
      registry: '0x...',  // TODO: Update after deployment
      galeon: '0x...',    // TODO: Update after deployment
    },
  },

  // Mantle Mainnet - For production
  5000: {
    chainId: 5000,
    name: 'Mantle',
    rpcUrl: 'https://rpc.mantle.xyz',
    explorer: 'https://mantlescan.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
    contracts: {
      announcer: '0x...', // TODO: Update after deployment
      registry: '0x...',  // TODO: Update after deployment
      galeon: '0x...',    // TODO: Update after deployment
    },
  },

  // Arbitrum Sepolia (for Sippy testing) - Future
  421614: {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    contracts: {
      announcer: '0x...', // TODO: Update after deployment
      registry: '0x...',  // TODO: Update after deployment
      galeon: '0x...',    // TODO: Update after deployment
    },
  },
}

// Helper functions
export function getChainConfig(chainId: number): ChainConfig {
  const config = chains[chainId]
  if (!config) throw new Error(`Unsupported chain: ${chainId}`)
  return config
}

export function getContracts(chainId: number) {
  const config = getChainConfig(chainId)
  return config.contracts
}
```

### Smart Contracts

#### ERC5564Announcer.sol

```solidity
// packages/contracts/contracts/ERC5564Announcer.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ERC-5564 Announcer
/// @notice Standard implementation for stealth address announcements
contract ERC5564Announcer {
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

    /// @notice Announce a stealth payment
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
}
```

#### ERC6538Registry.sol

```solidity
// packages/contracts/contracts/ERC6538Registry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ERC-6538 Stealth Meta-Address Registry
/// @notice Standard implementation for storing stealth meta-addresses
contract ERC6538Registry {
    /// @notice Emitted when a stealth meta-address is registered
    /// @param registrant The address registering the meta-address
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthMetaAddress The stealth meta-address (spending + viewing pubkeys)
    event StealthMetaAddressSet(
        address indexed registrant,
        uint256 indexed schemeId,
        bytes stealthMetaAddress
    );

    /// @notice Mapping: registrant => schemeId => stealthMetaAddress
    mapping(address => mapping(uint256 => bytes)) private _stealthMetaAddresses;

    /// @notice Register or update a stealth meta-address
    /// @param schemeId The stealth address scheme (1 = secp256k1)
    /// @param stealthMetaAddress The stealth meta-address (66 bytes for secp256k1)
    function registerKeys(uint256 schemeId, bytes calldata stealthMetaAddress) external {
        _stealthMetaAddresses[msg.sender][schemeId] = stealthMetaAddress;
        emit StealthMetaAddressSet(msg.sender, schemeId, stealthMetaAddress);
    }

    /// @notice Get a registrant's stealth meta-address
    /// @param registrant The address to query
    /// @param schemeId The stealth address scheme
    /// @return The stealth meta-address (empty if not registered)
    function stealthMetaAddressOf(
        address registrant,
        uint256 schemeId
    ) external view returns (bytes memory) {
        return _stealthMetaAddresses[registrant][schemeId];
    }
}
```

#### GaleonRegistry.sol (Galeon-specific)

```solidity
// packages/contracts/contracts/GaleonRegistry.sol
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
        address token,        // address(0) for native
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
    event PortDeactivated(
        address indexed owner,
        bytes32 indexed portId
    );

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

        // Also register in canonical registry (for interoperability)
        // Note: We register under msg.sender's address
        registry.registerKeys(SCHEME_ID, stealthMetaAddress);

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

        // Transfer native currency to stealth address
        (bool success, ) = stealthAddress.call{value: msg.value}("");
        require(success, "Native transfer failed");

        // Build metadata: viewTag (1 byte) + receiptHash (32 bytes)
        bytes memory metadata = abi.encodePacked(viewTag, receiptHash);

        // Announce via canonical contract
        announcer.announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata);

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

        // Transfer tokens to stealth address
        IERC20(token).safeTransferFrom(msg.sender, stealthAddress, amount);

        // Build metadata: viewTag (1) + receiptHash (32) + token (20) + amount (32)
        bytes memory metadata = abi.encodePacked(viewTag, receiptHash, token, amount);

        // Announce via canonical contract
        announcer.announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata);

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

    // ============ Batch Collection (Future) ============

    // TODO: Implement batch withdraw for relayer
    // function batchWithdrawNative(
    //     address[] calldata stealthAddresses,
    //     bytes[] calldata signatures,
    //     address recipient
    // ) external;
}
```

#### Interfaces

```solidity
// packages/contracts/contracts/interfaces/IERC5564Announcer.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC5564Announcer {
    event Announcement(
        uint256 indexed schemeId,
        address indexed stealthAddress,
        address indexed caller,
        bytes ephemeralPubKey,
        bytes metadata
    );

    function announce(
        uint256 schemeId,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata metadata
    ) external;
}
```

```solidity
// packages/contracts/contracts/interfaces/IERC6538Registry.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC6538Registry {
    event StealthMetaAddressSet(
        address indexed registrant,
        uint256 indexed schemeId,
        bytes stealthMetaAddress
    );

    function registerKeys(uint256 schemeId, bytes calldata stealthMetaAddress) external;
    function stealthMetaAddressOf(address registrant, uint256 schemeId) external view returns (bytes memory);
}
```

---

## Project Structure (Turborepo Monorepo)

```
galeon/
├── apps/
│   ├── web/                    # Next.js 15 (frontend only)
│   │   ├── app/
│   │   │   ├── page.tsx              # Landing
│   │   │   ├── setup/
│   │   │   │   └── page.tsx          # Onboarding (create first Port)
│   │   │   ├── dashboard/
│   │   │   │   ├── page.tsx          # Main dashboard
│   │   │   │   ├── vendor/
│   │   │   │   │   └── page.tsx      # Vendor mode (receive)
│   │   │   │   ├── user/
│   │   │   │   │   └── page.tsx      # User mode (send)
│   │   │   │   └── ports/
│   │   │   │       └── page.tsx      # Port management
│   │   │   ├── pay/
│   │   │   │   └── [portId]/
│   │   │   │       └── page.tsx      # Payer flow (by Port)
│   │   │   ├── collect/
│   │   │   │   └── page.tsx          # Collection interface
│   │   │   ├── receipt/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Receipt viewer
│   │   │   └── verify/
│   │   │       └── page.tsx          # Public verification
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn components
│   │   │   ├── WalletConnect.tsx
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── ReceiptCard.tsx
│   │   │   ├── PortCard.tsx
│   │   │   ├── PortCreator.tsx
│   │   │   ├── CollectionPanel.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   └── ModeSwitch.tsx        # Vendor/User toggle
│   │   ├── lib/
│   │   │   ├── wagmi.ts              # Wallet config (multi-chain)
│   │   │   ├── api.ts                # AdonisJS API client
│   │   │   └── transmit.ts           # SSE client
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── usePorts.ts
│   │   │   ├── useReceipts.ts
│   │   │   ├── useCollection.ts
│   │   │   └── usePaymentStream.ts   # Transmit SSE hook
│   │   └── package.json
│   │
│   ├── api/                    # AdonisJS 6 (backend)
│   │   ├── app/
│   │   │   ├── controllers/
│   │   │   │   ├── auth_controller.ts
│   │   │   │   ├── ports_controller.ts
│   │   │   │   ├── receipts_controller.ts
│   │   │   │   ├── collection_controller.ts
│   │   │   │   └── webhooks_controller.ts
│   │   │   ├── models/
│   │   │   │   ├── user.ts
│   │   │   │   ├── port.ts
│   │   │   │   └── receipt.ts
│   │   │   ├── jobs/
│   │   │   │   ├── process_payment.ts
│   │   │   │   ├── scan_port.ts
│   │   │   │   └── fetch_fx_rate.ts
│   │   │   ├── validators/
│   │   │   │   ├── auth.ts
│   │   │   │   ├── port.ts
│   │   │   │   └── receipt.ts
│   │   │   ├── middleware/
│   │   │   │   └── auth_middleware.ts
│   │   │   └── services/
│   │   │       ├── siwe_service.ts
│   │   │       ├── stealth_service.ts    # Wraps @galeon/stealth
│   │   │       ├── collection_service.ts
│   │   │       └── relayer_service.ts
│   │   ├── config/
│   │   │   ├── app.ts
│   │   │   ├── database.ts
│   │   │   ├── redis.ts
│   │   │   ├── transmit.ts
│   │   │   ├── auth.ts
│   │   │   └── jobs.ts
│   │   ├── database/
│   │   │   └── migrations/
│   │   │       ├── 001_create_users_table.ts
│   │   │       ├── 002_create_ports_table.ts
│   │   │       └── 003_create_receipts_table.ts
│   │   ├── start/
│   │   │   ├── env.ts
│   │   │   ├── kernel.ts
│   │   │   ├── routes.ts
│   │   │   └── transmit.ts
│   │   └── package.json
│   │
│   └── indexer/                # Ponder (blockchain indexing)
│       ├── ponder.config.ts
│       ├── ponder.schema.ts
│       ├── src/
│       │   └── index.ts              # Event handlers + webhook
│       └── package.json
│
├── packages/
│   ├── contracts/              # Solidity + Hardhat
│   │   ├── contracts/
│   │   │   ├── ERC5564Announcer.sol
│   │   │   ├── ERC6538Registry.sol
│   │   │   ├── GaleonRegistry.sol
│   │   │   └── interfaces/
│   │   │       ├── IERC5564Announcer.sol
│   │   │       └── IERC6538Registry.sol
│   │   ├── config/
│   │   │   └── chains.ts
│   │   ├── scripts/
│   │   │   └── deploy.ts             # Deploy all contracts
│   │   ├── test/
│   │   │   └── GaleonRegistry.test.ts
│   │   ├── hardhat.config.ts
│   │   └── package.json
│   │
│   └── stealth/                # Shared stealth crypto library
│       ├── src/
│       │   ├── index.ts              # Main exports + createStealthClient
│       │   ├── keys.ts               # Key derivation
│       │   ├── address.ts            # Stealth address generation
│       │   ├── scan.ts               # Announcement scanning
│       │   ├── config.ts             # Chain configuration
│       │   └── types.ts              # TypeScript types
│       ├── __tests__/
│       │   ├── properties.test.ts    # fast-check property tests
│       │   └── vectors.test.ts       # EIP-5564 test vectors
│       └── package.json
│
├── galeon-hackathon-plan.md
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md
```

---

## Stealth Library (packages/stealth)

### Main Exports

```typescript
// packages/stealth/src/index.ts

export * from './keys'
export * from './address'
export * from './scan'
export * from './config'
export * from './types'

import { chains, getChainConfig, getContracts } from './config'
import { deriveStealthKeys, derivePortKeys } from './keys'
import { generateStealthAddress } from './address'
import { scanAnnouncements } from './scan'

/**
 * Create a chain-specific stealth client
 * @param chainId - The chain ID to use
 * @returns Stealth client with chain-specific configuration
 */
export function createStealthClient(chainId: number) {
  const config = getChainConfig(chainId)
  const contracts = getContracts(chainId)

  return {
    chainId,
    config,
    contracts,

    // Key operations
    deriveKeys: deriveStealthKeys,
    derivePortKeys,

    // Address operations
    generateAddress: generateStealthAddress,

    // Scanning
    scan: scanAnnouncements,
  }
}

// Re-export chain config
export { chains, getChainConfig, getContracts }
```

### Key Derivation

```typescript
// packages/stealth/src/keys.ts

import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

export interface StealthKeys {
  spendingPrivateKey: Uint8Array
  spendingPublicKey: Uint8Array
  viewingPrivateKey: Uint8Array
  viewingPublicKey: Uint8Array
  stealthMetaAddress: `st:eth:0x${string}`
}

/**
 * Derive stealth keys from a signature (deterministic)
 * @param signature - Wallet signature of a specific message
 * @returns Complete stealth key set
 */
export function deriveStealthKeys(signature: `0x${string}`): StealthKeys {
  const sigBytes = hexToBytes(signature.slice(2))

  // Derive spending key from first half of signature hash
  const spendingEntropy = keccak_256(new Uint8Array([...sigBytes, 0x01]))
  const spendingPrivateKey = secp256k1.utils.normPrivateKeyToScalar(spendingEntropy)
  const spendingPublicKey = secp256k1.getPublicKey(spendingPrivateKey, true)

  // Derive viewing key from second half of signature hash
  const viewingEntropy = keccak_256(new Uint8Array([...sigBytes, 0x02]))
  const viewingPrivateKey = secp256k1.utils.normPrivateKeyToScalar(viewingEntropy)
  const viewingPublicKey = secp256k1.getPublicKey(viewingPrivateKey, true)

  // Build stealth meta-address (st:eth:0x<spending><viewing>)
  const stealthMetaAddress = `st:eth:0x${bytesToHex(spendingPublicKey)}${bytesToHex(viewingPublicKey)}` as const

  return {
    spendingPrivateKey: new Uint8Array(spendingPrivateKey.toString(16).padStart(64, '0').match(/.{2}/g)!.map(b => parseInt(b, 16))),
    spendingPublicKey,
    viewingPrivateKey: new Uint8Array(viewingPrivateKey.toString(16).padStart(64, '0').match(/.{2}/g)!.map(b => parseInt(b, 16))),
    viewingPublicKey,
    stealthMetaAddress,
  }
}

/**
 * Generate unique keys for a new Port (from master signature + port index)
 * @param masterSignature - User's master signature
 * @param portIndex - Unique index for this Port
 * @returns Port-specific stealth keys
 */
export function derivePortKeys(masterSignature: `0x${string}`, portIndex: number): StealthKeys {
  const sigBytes = hexToBytes(masterSignature.slice(2))
  const indexBytes = new Uint8Array(4)
  new DataView(indexBytes.buffer).setUint32(0, portIndex, false)

  // Combine signature with port index for unique derivation
  const combined = new Uint8Array([...sigBytes, ...indexBytes])
  const portSignature = `0x${bytesToHex(keccak_256(combined))}` as `0x${string}`

  return deriveStealthKeys(portSignature)
}
```

### Stealth Address Generation

```typescript
// packages/stealth/src/address.ts

import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

export interface StealthAddressResult {
  stealthAddress: `0x${string}`
  ephemeralPublicKey: Uint8Array
  viewTag: number
}

/**
 * Generate a stealth address for a payment
 * @param stealthMetaAddress - Recipient's stealth meta-address
 * @returns Stealth address, ephemeral key, and view tag
 */
export function generateStealthAddress(
  stealthMetaAddress: `st:eth:0x${string}`
): StealthAddressResult {
  // Parse meta-address: st:eth:0x<spending:33><viewing:33>
  const hexPart = stealthMetaAddress.slice(7) // Remove "st:eth:"
  const bytes = hexToBytes(hexPart.slice(2)) // Remove "0x"

  const spendingPubKey = bytes.slice(0, 33)
  const viewingPubKey = bytes.slice(33, 66)

  // Generate random ephemeral key pair
  const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey()
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true)

  // Compute shared secret: ECDH(ephemeral, viewing)
  const sharedPoint = secp256k1.getSharedSecret(ephemeralPrivateKey, viewingPubKey)
  const sharedSecret = keccak_256(sharedPoint.slice(1)) // Remove prefix byte

  // Derive stealth public key: spending + hash(shared) * G
  const stealthScalar = secp256k1.utils.normPrivateKeyToScalar(sharedSecret)
  const sharedPublicKey = secp256k1.ProjectivePoint.BASE.multiply(stealthScalar)
  const spendingPoint = secp256k1.ProjectivePoint.fromHex(spendingPubKey)
  const stealthPoint = spendingPoint.add(sharedPublicKey)
  const stealthPubKey = stealthPoint.toRawBytes(false) // Uncompressed

  // Derive Ethereum address from stealth public key
  const addressHash = keccak_256(stealthPubKey.slice(1)) // Remove 0x04 prefix
  const stealthAddress = `0x${bytesToHex(addressHash.slice(-20))}` as `0x${string}`

  // Compute view tag (first byte of hashed shared secret for efficient scanning)
  const viewTag = sharedSecret[0]

  return {
    stealthAddress,
    ephemeralPublicKey,
    viewTag,
  }
}
```

### Announcement Scanning

```typescript
// packages/stealth/src/scan.ts

import { secp256k1 } from '@noble/curves/secp256k1'
import { keccak_256 } from '@noble/hashes/sha3'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils'

export interface Announcement {
  stealthAddress: `0x${string}`
  ephemeralPubKey: Uint8Array
  metadata: Uint8Array
  txHash: `0x${string}`
  blockNumber: bigint
}

export interface ScannedPayment {
  stealthAddress: `0x${string}`
  stealthPrivateKey: Uint8Array
  amount: bigint
  token: `0x${string}` | null
  receiptHash: `0x${string}`
  txHash: `0x${string}`
  blockNumber: bigint
}

/**
 * Scan announcements to find payments belonging to a viewing key
 * @param announcements - List of announcements to scan
 * @param spendingPrivateKey - Port's spending private key
 * @param viewingPrivateKey - Port's viewing private key
 * @returns List of payments belonging to this Port
 */
export function scanAnnouncements(
  announcements: Announcement[],
  spendingPrivateKey: Uint8Array,
  viewingPrivateKey: Uint8Array
): ScannedPayment[] {
  const payments: ScannedPayment[] = []

  for (const announcement of announcements) {
    // Quick filter: check view tag first
    if (announcement.metadata.length > 0) {
      const expectedViewTag = computeViewTag(announcement.ephemeralPubKey, viewingPrivateKey)
      if (announcement.metadata[0] !== expectedViewTag) {
        continue // Not for us, skip
      }
    }

    // Full check: try to derive the stealth address
    const result = tryDeriveStealthAddress(
      announcement.ephemeralPubKey,
      spendingPrivateKey,
      viewingPrivateKey
    )

    if (result.stealthAddress.toLowerCase() === announcement.stealthAddress.toLowerCase()) {
      // This payment is for us!
      const payment: ScannedPayment = {
        stealthAddress: announcement.stealthAddress,
        stealthPrivateKey: result.stealthPrivateKey,
        amount: 0n, // Parsed from metadata or fetched from chain
        token: null,
        receiptHash: `0x${bytesToHex(announcement.metadata.slice(1, 33))}`,
        txHash: announcement.txHash,
        blockNumber: announcement.blockNumber,
      }

      // Parse token info from metadata if present
      if (announcement.metadata.length > 65) {
        payment.token = `0x${bytesToHex(announcement.metadata.slice(33, 53))}`
        payment.amount = BigInt(`0x${bytesToHex(announcement.metadata.slice(53, 85))}`)
      }

      payments.push(payment)
    }
  }

  return payments
}

function computeViewTag(ephemeralPubKey: Uint8Array, viewingPrivateKey: Uint8Array): number {
  const sharedPoint = secp256k1.getSharedSecret(viewingPrivateKey, ephemeralPubKey)
  const sharedSecret = keccak_256(sharedPoint.slice(1))
  return sharedSecret[0]
}

function tryDeriveStealthAddress(
  ephemeralPubKey: Uint8Array,
  spendingPrivateKey: Uint8Array,
  viewingPrivateKey: Uint8Array
): { stealthAddress: `0x${string}`; stealthPrivateKey: Uint8Array } {
  // Compute shared secret
  const sharedPoint = secp256k1.getSharedSecret(viewingPrivateKey, ephemeralPubKey)
  const sharedSecret = keccak_256(sharedPoint.slice(1))

  // Derive stealth private key: spending + hash(shared)
  const spendingScalar = secp256k1.utils.normPrivateKeyToScalar(spendingPrivateKey)
  const sharedScalar = secp256k1.utils.normPrivateKeyToScalar(sharedSecret)
  const stealthScalar = (spendingScalar + sharedScalar) % secp256k1.CURVE.n

  // Get stealth public key and derive address
  const stealthPubKey = secp256k1.getPublicKey(stealthScalar, false)
  const addressHash = keccak_256(stealthPubKey.slice(1))
  const stealthAddress = `0x${bytesToHex(addressHash.slice(-20))}` as `0x${string}`

  // Convert scalar back to bytes
  const stealthPrivateKey = new Uint8Array(
    stealthScalar.toString(16).padStart(64, '0').match(/.{2}/g)!.map(b => parseInt(b, 16))
  )

  return { stealthAddress, stealthPrivateKey }
}
```

---

## Real-time Flow (Ponder + Transmit)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REAL-TIME PAYMENT DETECTION                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Payment on-chain                                                     │
│     └── GaleonRegistry.payNative/payToken called                         │
│     └── Announcer.Announcement event emitted                             │
│     └── GaleonRegistry.ReceiptAnchored event emitted                     │
│                                                                          │
│  2. Ponder indexes events (~2-5s)                                        │
│     └── Triggers webhook to AdonisJS                                     │
│                                                                          │
│  3. AdonisJS receives webhook                                            │
│     ├── Updates receipt status in PostgreSQL                             │
│     ├── Queues background job (FX rate, notifications)                   │
│     └── Broadcasts via Transmit SSE                                      │
│                                                                          │
│  4. Frontend receives SSE                                                │
│     └── Dashboard updates instantly                                      │
│                                                                          │
│  TOTAL LATENCY: ~3-7 seconds (vs 10s polling)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Authentication Design (SIWE + Access Tokens)

### Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SIGN-IN WITH ETHEREUM (SIWE) + ACCESS TOKENS                           │
│                                                                          │
│  1. Frontend: Request nonce                                              │
│     POST /auth/nonce { walletAddress }                                   │
│     Response: { nonce, message }                                         │
│     → Nonce stored in Redis: siwe:nonce:{nonce} = walletAddress          │
│     → TTL: 5 minutes                                                     │
│                                                                          │
│  2. Frontend: Sign message with wallet                                   │
│     const signature = await signMessage({ message })                     │
│                                                                          │
│  3. Frontend: Verify signature                                           │
│     POST /auth/verify { walletAddress, message, signature }              │
│     → Verify signature matches message                                   │
│     → Check nonce exists in Redis (replay protection)                    │
│     → Delete nonce from Redis (one-time use)                             │
│     → Verify domain matches (galeon.xyz)                                 │
│     Response: { token, user }                                            │
│                                                                          │
│  4. Frontend: Store token, use for all requests                          │
│     Authorization: Bearer gln_xxxxx                                      │
│                                                                          │
│  5. Token expires after 30 days                                          │
│     Refresh by re-signing (step 1-3)                                     │
│                                                                          │
│  NONCE REPLAY PROTECTION:                                                │
│  • Nonce generated: crypto.randomUUID()                                  │
│  • Stored in Redis with 5 min TTL                                        │
│  • Deleted immediately after successful verification                     │
│  • Reusing nonce → "Invalid or expired nonce" error                      │
│                                                                          │
│  SIWE MESSAGE VALIDATION:                                                │
│  • Domain: must match "galeon.xyz" (or localhost in dev)                 │
│  • URI: must match API origin                                            │
│  • Issued At: must be within last 5 minutes                              │
│  • Expiration Time: must be in future (if present)                       │
│  • Chain ID: must match expected chain                                   │
│                                                                          │
│  FIRST LOGIN: Also derives master stealth signature for Port keys        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Security Model

**Problem:** Where do private keys live? How do we balance security and UX?

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY HIERARCHY                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WALLET SIGNATURE (never stored)                                         │
│       │                                                                  │
│       ├──► Master Seed = keccak256(signature)                            │
│       │         │                                                        │
│       │         ├──► Port 0 Keys (viewing + spending)                    │
│       │         ├──► Port 1 Keys (viewing + spending)                    │
│       │         └──► Port N Keys (viewing + spending)                    │
│                                                                          │
│  STORAGE MODEL:                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  VIEWING KEYS    → Encrypted in DB (AES-256-GCM)                │    │
│  │                    Allows background scanning without wallet     │    │
│  │                                                                  │    │
│  │  SPENDING KEYS   → NEVER stored, derived on-demand              │    │
│  │                    User signs to derive when collecting          │    │
│  │                                                                  │    │
│  │  MASTER SEED     → NEVER stored                                 │    │
│  │                    Derived from wallet signature each session    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ENCRYPTION KEY DERIVATION:                                              │
│  encryptionKey = HKDF(walletSignature, salt="galeon-viewing-v1")         │
│                                                                          │
│  SESSION FLOW:                                                           │
│  1. User connects wallet                                                 │
│  2. User signs SIWE message (login)                                      │
│  3. User signs key derivation message (unlocks viewing keys)             │
│  4. Session active: scanning works, dashboard updates                    │
│  5. To collect: user signs spending derivation message                   │
│                                                                          │
│  SECURITY GUARANTEES:                                                    │
│  • Server compromise → encrypted blobs, useless without wallet           │
│  • Scanning → works after session unlock (one signature)                 │
│  • Collection → requires fresh wallet signature                          │
│  • Each Port → cryptographically isolated keys                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key Derivation Messages:**

```typescript
// Message for deriving viewing key encryption
const VIEWING_KEY_MESSAGE = `Galeon Key Derivation

This signature unlocks your viewing keys for this session.
It does NOT authorize any transactions.

Domain: galeon.xyz
Action: Unlock viewing keys
Nonce: ${sessionNonce}`

// Message for deriving spending keys (collection)
const SPENDING_KEY_MESSAGE = `Galeon Collection Authorization

This signature authorizes collecting funds from your Ports.

Domain: galeon.xyz
Action: Derive spending keys
Ports: ${selectedPortIds.join(', ')}
Nonce: ${collectionNonce}`
```

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Blockchain** | Mantle L2 (+ Arbitrum for Sippy) | Low fees, EVM compatible |
| **Cryptography** | @noble/curves, @noble/hashes | Audited, browser-compatible |
| **Stealth Protocol** | EIP-5564 + ERC-6538 | Standard stealth addresses |
| **Smart Contracts** | Solidity + Hardhat | Standard tooling |
| **Frontend** | Next.js 15 + TypeScript | App router, React 19 |
| **Styling** | Tailwind CSS v4 | Rapid UI development |
| **Wallet** | wagmi v2 + viem | Modern, type-safe |
| **Backend** | AdonisJS 6 | Full-featured, TypeScript-first |
| **Auth** | SIWE + Access Tokens | Standard web3 auth pattern |
| **Real-time** | Ponder + Transmit SSE | Index + push |
| **Background Jobs** | adonisjs-jobs (BullMQ) | Reliable queue processing |
| **ORM** | Lucid (AdonisJS native) | Active Record, migrations |
| **Database** | PostgreSQL | Railway hosted |
| **Cache/Queues** | Redis | Railway hosted |
| **Indexer** | Ponder | Real-time blockchain indexing |
| **Monorepo** | Turborepo + pnpm | Efficient builds, shared code |
| **Hosting** | Railway (API, Indexer, DB, Redis) + Vercel (web) | Quick deployment |

---

## Code Quality Standards

### Principles

| Principle | Guideline |
|-----------|-----------|
| **DRY** | Extract shared logic into `packages/stealth`. No duplicate crypto code. |
| **File Size** | Target <300 LOC per file. Max 1K LOC only for complex contract logic. |
| **Function Size** | Max 50 LOC per function. If longer, split into smaller functions. |
| **Single Responsibility** | One file = one purpose. One function = one job. |
| **No Dead Code** | Delete unused imports, functions, and commented code. |
| **Type Safety** | Strict TypeScript. No `any`. Explicit return types on public APIs. |

### File Structure Guidelines

```
✓ GOOD: Small, focused files
  - keys.ts (80 LOC) - key derivation only
  - address.ts (60 LOC) - stealth address generation only
  - scan.ts (100 LOC) - announcement scanning only

✗ BAD: Monolithic files
  - stealth.ts (500 LOC) - everything mixed together
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case | `stealth-service.ts` |
| Classes/Types | PascalCase | `StealthKeys`, `Port` |
| Functions | camelCase | `derivePortKeys()` |
| Constants | SCREAMING_SNAKE | `SCHEME_ID`, `CANONICAL_ADDRESSES` |
| Database tables | snake_case | `ports`, `receipts` |
| API routes | kebab-case | `/auth/nonce`, `/ports/create` |

### Testing Requirements

- **Stealth library**: Property-based tests (fast-check) + EIP-5564 test vectors
- **Contracts**: Unit tests for all public functions, integration tests for flows
- **API**: Request/response validation tests
- **Frontend**: Manual testing (hackathon scope)

### Code Review Checklist

Before merging:
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Tests pass (`pnpm test`)
- [ ] No hardcoded secrets or API keys
- [ ] File < 300 LOC (or justified exception)

---

## Deployment Summary

| Service | Platform | URL | Command |
|---------|----------|-----|---------|
| **Next.js** (web) | Vercel | galeon.vercel.app | `vercel --prod` |
| **AdonisJS** (api) | Railway | api.galeon.xyz | `railway up` |
| **Ponder** (indexer) | Railway | indexer.galeon.xyz | `railway up` |
| **PostgreSQL** | Railway | (internal) | Auto-provisioned |
| **Redis** | Railway | (internal) | Auto-provisioned |
| **Contracts** | Mantle Sepolia | Mantlescan | `pnpm deploy` |

---

## Deployment Scripts

### Deploy All Contracts

```typescript
// packages/contracts/scripts/deploy.ts
import { ethers } from 'hardhat'
import { getChainConfig } from '../config/chains'

async function main() {
  const chainId = await ethers.provider.getNetwork().then(n => Number(n.chainId))
  const config = getChainConfig(chainId)

  console.log(`\nDeploying Galeon contracts to ${config.name} (${chainId})...\n`)

  // 1. Deploy ERC5564Announcer
  console.log('Deploying ERC5564Announcer...')
  const Announcer = await ethers.getContractFactory('ERC5564Announcer')
  const announcer = await Announcer.deploy()
  await announcer.waitForDeployment()
  const announcerAddr = await announcer.getAddress()
  console.log(`  ERC5564Announcer: ${announcerAddr}`)

  // 2. Deploy ERC6538Registry
  console.log('Deploying ERC6538Registry...')
  const Registry = await ethers.getContractFactory('ERC6538Registry')
  const registry = await Registry.deploy()
  await registry.waitForDeployment()
  const registryAddr = await registry.getAddress()
  console.log(`  ERC6538Registry: ${registryAddr}`)

  // 3. Deploy GaleonRegistry (depends on Announcer + Registry)
  console.log('Deploying GaleonRegistry...')
  const GaleonRegistry = await ethers.getContractFactory('GaleonRegistry')
  const galeon = await GaleonRegistry.deploy(announcerAddr, registryAddr)
  await galeon.waitForDeployment()
  const galeonAddr = await galeon.getAddress()
  console.log(`  GaleonRegistry: ${galeonAddr}`)

  // Output config update
  console.log(`\n✅ Deployment complete! Update config/chains.ts:\n`)
  console.log(`  ${chainId}: {`)
  console.log(`    ...`)
  console.log(`    contracts: {`)
  console.log(`      announcer: '${announcerAddr}',`)
  console.log(`      registry: '${registryAddr}',`)
  console.log(`      galeon: '${galeonAddr}',`)
  console.log(`    },`)
  console.log(`  },`)
}

main().catch(console.error)
```

---

## Development Phases

### Phase 1: Foundation

**Goal:** Backend + stealth library + contracts deployed

| Task | Description |
|------|-------------|
| Turborepo setup | Monorepo with apps/web, apps/api, apps/indexer, packages/contracts, packages/stealth |
| Railway infra | PostgreSQL + Redis provisioned |
| AdonisJS API | User/Port models, migrations, SIWE auth |
| Stealth library | Key derivation, Port keys, stealth address generation, scanning |
| Contracts | Deploy ERC5564Announcer + ERC6538Registry + GaleonRegistry to Mantle Sepolia |
| Ponder indexer | Schema, event handlers, webhook to API |
| Real-time | Transmit SSE, test full notification flow |

**Milestone:** Payment on testnet → Ponder indexes → API receives webhook → SSE broadcasts

### Phase 2: Frontend + Full Flow

**Goal:** Complete user journey from setup to collection

| Task | Description |
|------|-------------|
| Next.js setup | wagmi config, API client, Transmit client |
| `/setup` | Onboarding flow (create first Port) |
| `/dashboard/ports` | Port management UI |
| `/pay/[portId]` | Payment flow for payers |
| `/collect` | Collection interface (Collect All) |
| `/dashboard` | Vendor dashboard with real-time updates |
| Receipt verification | `/verify` page for public proof |

**Milestone:** Full flow: Setup → Create Port → Share Link → Pay → Instant Detection → Collect

### Phase 3: Polish + Submission

**Goal:** Production-ready for hackathon demo

| Task | Description |
|------|-------------|
| Error handling | User-friendly error messages, loading states |
| Smoke tests | End-to-end tests on Mantle Sepolia |
| Evidence bundle | Screenshots, video demo, architecture diagrams |
| README | Setup instructions, feature overview |
| Track descriptions | Hackathon submission write-up |
| Final testing | Full flow verification |
| Submit | Hackathon submission |

**Milestone:** Submission complete with working demo

---

## Receipt Schema

Receipts are the verifiable proof of payment. The receipt hash is anchored on-chain.

### Receipt Structure

```typescript
interface Receipt {
  // Identifiers
  id: string                    // UUID
  receiptHash: `0x${string}`    // keccak256 of receipt data (anchored on-chain)

  // Payment info
  portId: bytes32               // Which Port received payment
  amount: string                // Payment amount (wei as string)
  currency: 'MNT' | 'ETH'       // Native currency

  // Parties
  vendorAddress: `0x${string}`  // Vendor's main wallet
  payerAddress: `0x${string}`   // Payer's wallet
  stealthAddress: `0x${string}` // Stealth address that received funds

  // Metadata
  memo: string                  // Optional payment memo
  timestamp: number             // Unix timestamp

  // On-chain reference
  txHash: `0x${string}`         // Transaction hash
  blockNumber: number           // Block number
  chainId: number               // Chain ID
}
```

### Receipt Hash Computation

```typescript
function computeReceiptHash(receipt: Omit<Receipt, 'id' | 'receiptHash' | 'txHash' | 'blockNumber'>): `0x${string}` {
  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['bytes32', 'uint256', 'string', 'address', 'address', 'string', 'uint256', 'uint256'],
    [
      receipt.portId,
      receipt.amount,
      receipt.currency,
      receipt.vendorAddress,
      receipt.payerAddress,
      receipt.memo,
      receipt.timestamp,
      receipt.chainId,
    ]
  )
  return keccak256(encoded)
}
```

### Verification Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      RECEIPT VERIFICATION                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User visits /verify?receipt=<receiptId>                              │
│                                                                          │
│  2. Frontend fetches receipt from API                                    │
│                                                                          │
│  3. Frontend computes expected receiptHash from receipt data             │
│                                                                          │
│  4. Frontend queries on-chain ReceiptAnchored event                      │
│     - Matches receiptHash                                                │
│     - Confirms amount, payer, timestamp                                  │
│                                                                          │
│  5. Display verification result:                                         │
│     ✓ Payment verified on Mantle                                        │
│     ✓ Amount: 1.5 MNT                                                   │
│     ✓ Timestamp: Dec 26, 2025 14:30 UTC                                 │
│     ✓ Transaction: 0xabc...def (link to Mantlescan)                     │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Reliability & Abuse Prevention

### Webhook Reliability

Ponder webhooks can fail. We add a reconciliation job to catch missed events.

```typescript
// apps/api/app/jobs/reconcile_payments.ts
// Runs every 5 minutes via BullMQ scheduler

export default class ReconcilePayments {
  async handle() {
    // 1. Get last processed block from DB
    const lastBlock = await Setting.getValue('lastProcessedBlock')

    // 2. Query Ponder GraphQL for events since lastBlock
    const events = await ponderClient.query({
      announcements: {
        where: { blockNumber_gt: lastBlock },
        orderBy: 'blockNumber',
      }
    })

    // 3. For each event, check if we have a receipt
    for (const event of events) {
      const exists = await Receipt.findBy('txHash', event.txHash)
      if (!exists) {
        // Missed webhook - process now
        await this.processPayment(event)
      }
    }

    // 4. Update last processed block
    await Setting.setValue('lastProcessedBlock', events.at(-1)?.blockNumber)
  }
}
```

### Batch Collection >10 Addresses

When a user has more than 10 pending stealth addresses, we split into multiple transactions:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    BATCH OVERFLOW HANDLING                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  SCENARIO: User has 25 pending stealth addresses                         │
│                                                                          │
│  UX FLOW:                                                                │
│  1. User clicks "Collect All - 25 payments (2.5 MNT)"                    │
│  2. Modal: "This requires 3 transactions. Continue?"                     │
│  3. User confirms                                                        │
│  4. Progress UI:                                                         │
│     ┌────────────────────────────────────────────────────┐              │
│     │  Collecting funds...                               │              │
│     │                                                    │              │
│     │  [████████████░░░░░░░░░░░░░░░░░░░░░] 2/3            │              │
│     │                                                    │              │
│     │  ✓ Batch 1: 10 addresses (1.0 MNT)                 │              │
│     │  ✓ Batch 2: 10 addresses (1.0 MNT)                 │              │
│     │  ◐ Batch 3: 5 addresses (0.5 MNT)                  │              │
│     │                                                    │              │
│     │  [Cancel Remaining]                                │              │
│     └────────────────────────────────────────────────────┘              │
│  5. On completion: "Successfully collected 2.5 MNT!"                     │
│                                                                          │
│  STATE TRACKING:                                                         │
│  • pendingCollections table tracks in-flight batches                     │
│  • Each stealth address marked as "claiming" in Redis lock               │
│    Key: claim:lock:{stealthAddress} = collectionId, TTL: 10 min          │
│  • Lock checked before collection → prevents double-collect              │
│  • Lock released on success OR on TTL expiry (auto-cleanup)              │
│  • Frontend polls status until all complete                              │
│  • If batch fails, remaining batches are cancelled, locks released       │
│  • Reconciliation job cleans up stale pending records + expired locks    │
│                                                                          │
│  EDGE CASES:                                                             │
│  • User closes browser: pending batches complete, UI syncs on return     │
│  • Network error mid-batch: partial success, remaining retry-able        │
│  • "Collect All" disabled while any collection is pending                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Relayer Rate Limits

Prevent abuse of the gas-sponsored collection.

```typescript
// Collection rate limits
const RATE_LIMITS = {
  collectionsPerDay: 5,        // Max collections per user per day
  collectionsPerHour: 2,       // Max collections per user per hour
  maxStealthAddresses: 10,     // Max addresses per collection batch
  maxBatchesPerCollection: 5,  // Max 50 addresses per "Collect All"
}

// apps/api/app/middleware/rate_limit_middleware.ts
export default class RateLimitMiddleware {
  async handle({ auth, response }: HttpContext, next: () => Promise<void>) {
    const user = auth.user!
    const key = `collections:${user.id}:${dayKey()}`

    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, 86400) // 24h TTL

    if (count > RATE_LIMITS.collectionsPerDay) {
      return response.tooManyRequests({
        error: 'Daily collection limit reached',
        resetAt: nextMidnight(),
      })
    }

    await next()
  }
}
```

### Relayer Funding

```typescript
// Relayer wallet setup for hackathon
const RELAYER_CONFIG = {
  // Fund with enough for ~100 demo collections
  initialFunding: '1', // 1 MNT

  // Estimated gas per collection batch
  gasPerCollection: 200_000n,

  // Alert threshold
  lowBalanceThreshold: '0.1', // 0.1 MNT
}
```

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Privacy model | One stealth meta-address per Port | Cryptographic isolation |
| Terminology | Port, Collect | Nautical theme (Galeon) |
| Port types | Permanent, Recurring, One-time, Burner | Flexibility for all use cases |
| User modes | Vendor (receive) + User (send) | Different analytics needs |
| Contract deployment | Own EIP-5564/6538 copies + GaleonRegistry | Canonical not on Mantle, simple deployment |
| Chain support | Mantle Sepolia (hackathon) + Arbitrum (Sippy) | Future extensibility |
| Collection gas | Relayer pays (5/day limit) | Simple UX, abuse prevention |
| Key security | Viewing encrypted in DB, spending never stored | Server compromise = safe |
| Webhook reliability | Reconciliation job every 5 min | Catch missed events |
| SIWE nonces | Redis with 5 min TTL, deleted on use | Replay protection |
| Batch overflow | Multi-tx with progress UI, max 50 addresses | Handle large collections |

---

*Last updated: December 26, 2025*
