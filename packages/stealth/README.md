# @galeon/stealth

TypeScript library for EIP-5564 stealth address cryptography.

## Installation

```bash
pnpm add @galeon/stealth
```

## Quick Start

```typescript
import { createStealthClient } from '@galeon/stealth'

// Create a client for Mantle Mainnet
const client = createStealthClient(5000)

// 1. Recipient: Derive stealth keys from wallet signature
const DERIVATION_MESSAGE = `Galeon Stealth Key Derivation

Sign this message to derive your stealth keys.
This does NOT authorize any transactions.`

const signature = await wallet.signMessage(DERIVATION_MESSAGE)
const keys = client.deriveKeys(signature)
console.log(keys.stealthMetaAddress) // st:mnt:0x...

// 2. Payer: Generate stealth address for payment
const { stealthAddress, ephemeralPublicKey, viewTag } = client.generateAddress(recipientMetaAddress)
// Send funds to stealthAddress, include ephemeralPublicKey in announcement

// 3. Recipient: Scan for incoming payments
const payments = client.scan(announcements, keys.spendingPrivateKey, keys.viewingPrivateKey)
for (const payment of payments) {
  console.log(`Received ${payment.amount} at ${payment.stealthAddress}`)
  // Use payment.stealthPrivateKey to claim funds
}
```

## API Reference

### `createStealthClient(chainId, options?)`

Create a chain-specific stealth client with pre-loaded configuration.

```typescript
const client = createStealthClient(5000) // Mantle Mainnet
const client = createStealthClient(5003) // Mantle Sepolia
const client = createStealthClient(5000, { chainPrefix: 'eth' }) // Use st:eth: prefix
```

**Returns:** `StealthClient`

| Property                                       | Type             | Description                |
| ---------------------------------------------- | ---------------- | -------------------------- |
| `chainId`                                      | `number`         | Chain ID                   |
| `chainPrefix`                                  | `'eth' \| 'mnt'` | Meta-address prefix        |
| `config`                                       | `ChainConfig`    | Chain configuration        |
| `contracts`                                    | `object`         | Contract addresses         |
| `schemeId`                                     | `number`         | EIP-5564 scheme (always 1) |
| `deriveKeys(sig)`                              | `function`       | Derive stealth keys        |
| `derivePortKeys(sig, index)`                   | `function`       | Derive Port-specific keys  |
| `generateAddress(metaAddr)`                    | `function`       | Generate stealth address   |
| `scan(announcements, spendingKey, viewingKey)` | `function`       | Scan for payments          |

---

### Key Derivation

#### `deriveStealthKeys(signature, chainPrefix?)`

Derive stealth keys from a wallet signature using HKDF-SHA256.

```typescript
import { deriveStealthKeys } from '@galeon/stealth'

const keys = deriveStealthKeys(signature, 'mnt')
// keys.spendingPrivateKey  - 32 bytes
// keys.spendingPublicKey   - 33 bytes (compressed)
// keys.viewingPrivateKey   - 32 bytes
// keys.viewingPublicKey    - 33 bytes (compressed)
// keys.stealthMetaAddress  - st:mnt:0x...
```

#### `derivePortKeys(masterSignature, portIndex, chainPrefix?)`

Derive cryptographically independent keys for a specific Port.

```typescript
import { derivePortKeys } from '@galeon/stealth'

const port0Keys = derivePortKeys(masterSig, 0)
const port1Keys = derivePortKeys(masterSig, 1)
// port0Keys and port1Keys are independent
```

#### `parseStealthMetaAddress(metaAddress)`

Parse a stealth meta-address into component public keys.

```typescript
import { parseStealthMetaAddress } from '@galeon/stealth'

const { spendingPublicKey, viewingPublicKey, chainPrefix } = parseStealthMetaAddress('st:mnt:0x...')
```

#### `formatStealthMetaAddress(spendingPubKey, viewingPubKey, chainPrefix?)`

Format public keys into a stealth meta-address.

```typescript
import { formatStealthMetaAddress } from '@galeon/stealth'

const metaAddress = formatStealthMetaAddress(spendingPubKey, viewingPubKey, 'mnt')
// Returns: st:mnt:0x...
```

---

### Address Generation

#### `generateStealthAddress(stealthMetaAddress)`

Generate a one-time stealth address for a payment.

```typescript
import { generateStealthAddress } from '@galeon/stealth'

const { stealthAddress, ephemeralPublicKey, viewTag } = generateStealthAddress('st:mnt:0x...')

// stealthAddress     - 0x... (send funds here)
// ephemeralPublicKey - 33 bytes (include in announcement)
// viewTag            - 0-255 (for efficient scanning)
```

#### `generateStealthAddressDeterministic(metaAddress, ephemeralPrivateKey)`

Generate a stealth address with a specific ephemeral key (for testing).

```typescript
import { generateStealthAddressDeterministic } from '@galeon/stealth'

const ephemeralKey = new Uint8Array(32).fill(1)
const result = generateStealthAddressDeterministic(metaAddress, ephemeralKey)
```

#### `computeViewTag(ephemeralPublicKey, viewingPrivateKey)`

Compute the view tag for an ephemeral key (for quick filtering).

```typescript
import { computeViewTag } from '@galeon/stealth'

const viewTag = computeViewTag(ephemeralPubKey, viewingPrivKey) // 0-255
```

#### `deriveStealthPrivateKey(ephemeralPublicKey, spendingPrivateKey, viewingPrivateKey)`

Derive the private key to control a stealth address.

```typescript
import { deriveStealthPrivateKey } from '@galeon/stealth'

const { stealthAddress, stealthPrivateKey } = deriveStealthPrivateKey(
  ephemeralPubKey,
  spendingPrivKey,
  viewingPrivKey
)
// Use stealthPrivateKey to sign transactions from stealthAddress
```

#### `prepareEOAPayment(recipientAddress)`

Prepare payment parameters for a regular EOA recipient. Use this when paying to a regular wallet (not a stealth meta-address). The sender still gets privacy benefits when using Fog Mode.

```typescript
import { prepareEOAPayment } from '@galeon/stealth'

// Fog Mode: pay to regular wallet with sender privacy
const params = prepareEOAPayment('0x1234...abcd')

// Use with GaleonRegistry.payNative
await contract.payNative(
  params.recipient, // The EOA address
  params.ephemeralPublicKey, // 33 zero bytes
  params.viewTag, // 0
  receiptHash,
  { value: amount }
)
```

#### `prepareStealthPayment(stealthMetaAddress)`

Prepare payment parameters for a stealth meta-address recipient. Wrapper around `generateStealthAddress` with a consistent return format.

```typescript
import { prepareStealthPayment } from '@galeon/stealth'

const params = prepareStealthPayment('st:mnt:0x...')

// Use with GaleonRegistry.payNative
await contract.payNative(
  params.recipient, // One-time stealth address
  params.ephemeralPublicKey, // For recipient to scan
  params.viewTag, // For efficient filtering
  receiptHash,
  { value: amount }
)
```

**When to use:**

- `prepareEOAPayment` - Recipient is a regular wallet (sender privacy only via Fog Mode)
- `prepareStealthPayment` - Recipient has stealth keys (full sender + recipient privacy)

---

### Scanning

#### `scanAnnouncements(announcements, spendingPrivateKey, viewingPrivateKey)`

Scan announcements to find payments belonging to your keys.

```typescript
import { scanAnnouncements } from '@galeon/stealth'

const payments = scanAnnouncements(announcements, keys.spendingPrivateKey, keys.viewingPrivateKey)

for (const payment of payments) {
  console.log(`Found payment:`)
  console.log(`  Address: ${payment.stealthAddress}`)
  console.log(`  Amount: ${payment.amount}`)
  console.log(`  Token: ${payment.token ?? 'native'}`)
  console.log(`  Receipt: ${payment.receiptHash}`)
  console.log(`  Block: ${payment.blockNumber}`)
}
```

**Performance:** View tags filter ~99.6% of irrelevant announcements in O(1).

#### `checkAnnouncement(announcement, spendingPrivateKey, viewingPrivateKey)`

Check a single announcement (for real-time monitoring).

```typescript
import { checkAnnouncement } from '@galeon/stealth'

const payment = checkAnnouncement(announcement, spendingPrivKey, viewingPrivKey)
if (payment) {
  console.log('Payment received!')
}
```

#### `buildAnnouncementMetadata(viewTag, receiptHash, token?, amount?)`

Build metadata bytes for an announcement.

```typescript
import { buildAnnouncementMetadata } from '@galeon/stealth'

// Native payment
const nativeMeta = buildAnnouncementMetadata(viewTag, receiptHash)

// Token payment
const tokenMeta = buildAnnouncementMetadata(viewTag, receiptHash, tokenAddr, amount)
```

---

### Configuration

#### `getChainConfig(chainId)`

Get configuration for a supported chain.

```typescript
import { getChainConfig } from '@galeon/stealth'

const config = getChainConfig(5000) // Mantle Mainnet
// config.rpcUrl, config.explorer, config.contracts, etc.
```

#### `getContracts(chainId)`

Get contract addresses for a chain.

```typescript
import { getContracts } from '@galeon/stealth'

const contracts = getContracts(5000)
// contracts.announcer, contracts.registry, contracts.galeon, contracts.tender
```

#### `getSupportedTokens(chainId)`

Get supported tokens for a chain.

```typescript
import { getSupportedTokens } from '@galeon/stealth'

const tokens = getSupportedTokens(5000)
// [{ address: '0x...', symbol: 'USDT', decimals: 6 }, ...]
```

#### Constants

```typescript
import { SCHEME_ID, chains, supportedTokens } from '@galeon/stealth'

SCHEME_ID // 1 (secp256k1 with view tags)
chains // { 5000: {...}, 5003: {...} }
```

---

## Types

```typescript
// Stealth meta-address format
type StealthMetaAddress = `st:${'eth' | 'mnt'}:0x${string}`

// Stealth key set
interface StealthKeys {
  spendingPrivateKey: Uint8Array // 32 bytes
  spendingPublicKey: Uint8Array // 33 bytes (compressed)
  viewingPrivateKey: Uint8Array // 32 bytes
  viewingPublicKey: Uint8Array // 33 bytes (compressed)
  stealthMetaAddress: StealthMetaAddress
}

// Generated stealth address result
interface StealthAddressResult {
  stealthAddress: `0x${string}`
  ephemeralPublicKey: Uint8Array // 33 bytes
  viewTag: number // 0-255
}

// On-chain announcement
interface Announcement {
  stealthAddress: `0x${string}`
  ephemeralPubKey: Uint8Array // 33 bytes
  metadata: Uint8Array
  txHash: `0x${string}`
  blockNumber: bigint
}

// Scanned payment
interface ScannedPayment {
  stealthAddress: `0x${string}`
  stealthPrivateKey: Uint8Array // 32 bytes (to claim funds)
  amount: bigint
  token: `0x${string}` | null // null = native currency
  receiptHash: `0x${string}`
  txHash: `0x${string}`
  blockNumber: bigint
}

// Chain configuration
interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorer: string
  nativeCurrency: { name: string; symbol: string; decimals: number }
  contracts: {
    announcer: `0x${string}`
    registry: `0x${string}`
    galeon: `0x${string}`
    tender: `0x${string}`
  }
}
```

---

## Cryptographic Details

### Key Derivation

Keys are derived using HKDF-SHA256 with domain separation:

```
spending_key = HKDF(signature, salt, "galeon-stealth-spending-v1")
viewing_key  = HKDF(signature, salt, "galeon-stealth-viewing-v1")
```

Port-specific keys use the port index as additional salt:

```
port_spending = HKDF(signature, port_salt, "galeon-port-derivation-v1-spending")
port_viewing  = HKDF(signature, port_salt, "galeon-port-derivation-v1-viewing")
```

### Stealth Address Generation

1. Generate random ephemeral key pair: `(r, R = r*G)`
2. Compute shared secret: `S = r * V` (V = viewing public key)
3. Hash shared secret: `h = keccak256(S.x)`
4. Derive stealth public key: `P = K + h*G` (K = spending public key)
5. Derive Ethereum address: `addr = keccak256(P)[12:]`
6. View tag: `h[0]`

### Stealth Private Key Derivation

```
stealth_private_key = (spending_private_key + h) mod n
```

### Dependencies

- `@noble/curves` - secp256k1 elliptic curve operations
- `@noble/hashes` - SHA256, Keccak256, HKDF

---

## Contract Addresses

### Mantle Mainnet (5000)

| Contract  | Address                                      |
| --------- | -------------------------------------------- |
| Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` |
| Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` |
| Galeon    | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` |

### Other Chains

ERC-5564 and ERC-6538 are EIP standards with canonical deployments on some chains:

- Check [eip5564.eth](https://etherscan.io/address/eip5564.eth) for existing Announcer
- Check [eip6538.eth](https://etherscan.io/address/eip6538.eth) for existing Registry

Use `updateContractAddresses()` to configure existing deployments:

```typescript
import { updateContractAddresses } from '@galeon/stealth'

updateContractAddresses(1, {
  announcer: '0x...', // Existing ERC-5564
  registry: '0x...', // Existing ERC-6538
  galeon: '0x...', // Deploy GaleonRegistry
})
```

---

## Testing

```bash
pnpm test
```

30 tests (stealth library) covering:

- Key derivation (deterministic, domain separation)
- Address generation (ECDH, point math)
- Scanning (view tag filtering, payment parsing)
- Edge cases (invalid inputs, curve points)
