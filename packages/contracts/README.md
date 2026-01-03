# @galeon/contracts

Solidity smart contracts for private payments using EIP-5564 stealth addresses on Mantle.

## Overview

Galeon implements stealth addresses for privacy-preserving payments. When a payer sends funds, they generate a one-time stealth address that only the recipient can control, hiding the link between payer and recipient on-chain.

## Contracts

### Contract Types

| Contract         | Type            | Multi-chain Note                                                                          |
| ---------------- | --------------- | ----------------------------------------------------------------------------------------- |
| ERC5564Announcer | EIP Standard    | May exist on other chains - check [eip5564.eth](https://etherscan.io/address/eip5564.eth) |
| ERC6538Registry  | EIP Standard    | May exist on other chains - check [eip6538.eth](https://etherscan.io/address/eip6538.eth) |
| GaleonRegistry   | Galeon-specific | Must deploy per chain                                                                     |

> **Note:** On chains with existing ERC-5564/6538 deployments, you can use those instead of deploying new ones. Just update the constructor addresses when deploying GaleonRegistry.

---

### ERC5564Announcer

Standard EIP-5564 announcer with trusted relayer extension.

**Address (Mantle):** `0x8C04238c49e22EB687ad706bEe645698ccF41153`

```solidity
// Announce a payment (caller = msg.sender)
function announce(
    uint256 schemeId,           // 1 = secp256k1
    address stealthAddress,     // Generated stealth address
    bytes calldata ephemeralPubKey,  // 33-byte compressed pubkey
    bytes calldata metadata     // viewTag + receiptHash + optional token data
) external;

// Announce on behalf of another address (trusted relayers only)
function announceFor(
    uint256 schemeId,
    address stealthAddress,
    address caller,             // Actual payer to attribute
    bytes calldata ephemeralPubKey,
    bytes calldata metadata
) external;

// Owner functions
function setTrustedRelayer(address relayer, bool trusted) external onlyOwner;
```

**Events:**

```solidity
event Announcement(
    uint256 indexed schemeId,
    address indexed stealthAddress,
    address indexed caller,
    bytes ephemeralPubKey,
    bytes metadata
);

event TrustedRelayerUpdated(address indexed relayer, bool trusted);
```

---

### ERC6538Registry

Standard EIP-6538 stealth meta-address registry.

**Address (Mantle):** `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22`

```solidity
// Register your stealth meta-address
function registerKeys(
    uint256 schemeId,                    // 1 = secp256k1
    bytes calldata stealthMetaAddress    // 66 bytes (spending + viewing pubkeys)
) external;

// Query a user's meta-address
function stealthMetaAddressOf(
    address registrant,
    uint256 schemeId
) external view returns (bytes memory);
```

**Events:**

```solidity
event StealthMetaAddressSet(
    address indexed registrant,
    uint256 indexed schemeId,
    bytes stealthMetaAddress
);
```

---

### GaleonRegistry

Main contract for Port management and payments with receipt anchoring.

**Address (Mantle):** `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D`

#### Port Management

```solidity
// Register a new Port (payment endpoint)
function registerPort(
    bytes32 portId,                      // keccak256(name + random)
    string calldata name,                // Human-readable name
    bytes calldata stealthMetaAddress    // 66 bytes
) external;

// Deactivate a Port (owner only)
function deactivatePort(bytes32 portId) external;

// Note: registerPort does NOT auto-register in ERC6538Registry.
// Users should call ERC6538Registry.registerKeys() directly if needed.

// Query Port data
function getPortMetaAddress(bytes32 portId) external view returns (bytes memory);
function portOwners(bytes32 portId) external view returns (address);
function portActive(bytes32 portId) external view returns (bool);
```

#### Payments

```solidity
// Pay native currency (MNT) to a stealth address
function payNative(
    address stealthAddress,
    bytes calldata ephemeralPubKey,      // 33 bytes compressed
    bytes1 viewTag,                      // For efficient scanning
    bytes32 receiptHash                  // Off-chain receipt verification
) external payable;

// Pay ERC-20 tokens to a stealth address
function payToken(
    address token,
    address stealthAddress,
    uint256 amount,
    bytes calldata ephemeralPubKey,
    bytes1 viewTag,
    bytes32 receiptHash
) external;
```

**Events:**

```solidity
event PortRegistered(
    address indexed owner,
    bytes32 indexed portId,
    string name,
    bytes stealthMetaAddress
);

event PortDeactivated(address indexed owner, bytes32 indexed portId);

event ReceiptAnchored(
    address indexed stealthAddress,
    bytes32 indexed receiptHash,
    address indexed payer,
    uint256 amount,
    address token,        // address(0) for native
    uint256 timestamp
);
```

---

## Metadata Format

### Native Payments (33 bytes)

| Offset | Size | Field        |
| ------ | ---- | ------------ |
| 0      | 1    | View Tag     |
| 1      | 32   | Receipt Hash |

### Token Payments (85 bytes)

| Offset | Size | Field         |
| ------ | ---- | ------------- |
| 0      | 1    | View Tag      |
| 1      | 32   | Receipt Hash  |
| 33     | 20   | Token Address |
| 53     | 32   | Amount        |

---

## Security Features

| Feature           | Contract         | Purpose                        |
| ----------------- | ---------------- | ------------------------------ |
| Trusted Relayers  | ERC5564Announcer | Prevents announcement spoofing |
| ReentrancyGuard   | GaleonRegistry   | Prevents reentrancy attacks    |
| SafeERC20         | GaleonRegistry   | Safe token transfers           |
| Pubkey Validation | GaleonRegistry   | Validates 0x02/0x03 prefix     |

---

## Deployment

### Mantle Mainnet (Chain ID: 5000)

| Contract         | Address                                      | Verified                                                                               |
| ---------------- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` | [View](https://mantlescan.xyz/address/0x8C04238c49e22EB687ad706bEe645698ccF41153#code) |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` | [View](https://mantlescan.xyz/address/0xE6586103756082bf3E43D3BB73f9fE479f0BDc22#code) |
| GaleonRegistry   | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` | [View](https://mantlescan.xyz/address/0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D#code) |

### Deploy Commands

```bash
# Deploy stealth contracts to Mantle Mainnet (already done)
npx hardhat run scripts/deploy.ts --network mantle

# Deploy Privacy Pool to Mantle Mainnet
npx hardhat run scripts/deploy-pool.ts --network mantle

# Verify contracts
npx hardhat verify --network mantle <address>
```

### Privacy Pool (Chain ID: 5000)

| Contract                | Address                                      | Verified                                                                          |
| ----------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| PoseidonT3              | `0xAE4c25FF221d3aa361B39DA242357fa04420215D` | [View](https://mantlescan.xyz/address/0xAE4c25FF221d3aa361B39DA242357fa04420215D) |
| PoseidonT4              | `0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45` | [View](https://mantlescan.xyz/address/0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45) |
| WithdrawalVerifier      | `0x7529e3ec251A648A873F53d9969c1C05a44029A1` | [View](https://mantlescan.xyz/address/0x7529e3ec251A648A873F53d9969c1C05a44029A1) |
| RagequitVerifier        | `0xFDb199E0aC8eC430541438aa6E63101F8C205D76` | [View](https://mantlescan.xyz/address/0xFDb199E0aC8eC430541438aa6E63101F8C205D76) |
| GaleonEntrypoint        | `0x54BA91d29f84B8bAd161880798877e59f2999f7a` | [View](https://mantlescan.xyz/address/0x54BA91d29f84B8bAd161880798877e59f2999f7a) |
| GaleonPrivacyPoolSimple | `0x3260c8d8cc654B0897cd93cdf0662Fa679656b36` | [View](https://mantlescan.xyz/address/0x3260c8d8cc654B0897cd93cdf0662Fa679656b36) |

---

## Testing

```bash
# Run all tests (90 tests)
pnpm test

# Run specific test file
pnpm test test/GaleonRegistry.test.ts

# Run with gas reporting
REPORT_GAS=true pnpm test
```

---

## Access Control

| Contract         | Owner    | Can Do                                             |
| ---------------- | -------- | -------------------------------------------------- |
| ERC5564Announcer | Deployer | `setTrustedRelayer()`                              |
| ERC6538Registry  | None     | Permissionless                                     |
| GaleonRegistry   | Deployer | `setAuthorizedPool()`, `setFrozenStealthAddress()` |

**Recommendation:** Transfer ownership to a multisig for production.

---

## Standards

- [EIP-5564](https://eips.ethereum.org/EIPS/eip-5564): Stealth Addresses
- [EIP-6538](https://eips.ethereum.org/EIPS/eip-6538): Stealth Meta-Address Registry
- Scheme ID 1: secp256k1 with view tags

---

## License

This package is licensed under the **Apache License 2.0**. See [LICENSE](./LICENSE) for the full text.

### Attribution

The Privacy Pool contracts (`contracts/privacy-pool/`) are adapted from [0xbow privacy-pools-core](https://github.com/0xbow-io/privacy-pools-core) under Apache 2.0.

**Galeon Modifications:**

- Port-only deposits via GaleonRegistry integration
- verifiedBalance tracking to prevent dirty sends
- Stealth address freezing for compliance
- UUPS upgradeability for future circuit upgrades
- Per-proxy SCOPE computation for proof domain separation

### Dependencies

| Library                                                                | License | Use                        |
| ---------------------------------------------------------------------- | ------- | -------------------------- |
| [OpenZeppelin](https://openzeppelin.com)                               | MIT     | Smart contract standards   |
| [ZK-Kit](https://github.com/privacy-scaling-explorations/zk-kit)       | MIT     | Merkle tree implementation |
| [poseidon-solidity](https://github.com/chancehudson/poseidon-solidity) | MIT     | Poseidon hash function     |

All dependencies are permissively licensed (MIT) and compatible with commercial use.
