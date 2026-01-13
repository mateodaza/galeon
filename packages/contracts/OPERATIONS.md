# Galeon Contracts Operations Guide

Complete reference for deployed contracts, operations, and administration.

---

## Table of Contents

1. [Deployed Contracts](#deployed-contracts)
2. [Contract Architecture](#contract-architecture)
3. [Owner Operations](#owner-operations)
4. [User Operations](#user-operations)
5. [Adding ERC20 Pools](#adding-erc20-pools)
6. [Upgrading Contracts](#upgrading-contracts)
7. [Emergency Procedures](#emergency-procedures)
8. [Verification Commands](#verification-commands)

---

## Deployed Contracts

### Mantle Mainnet (Chain ID: 5000)

#### Stealth Addresses

| Contract         | Address                                      | Purpose                       |
| ---------------- | -------------------------------------------- | ----------------------------- |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` | Stealth payment announcements |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` | Stealth meta-address registry |
| GaleonRegistry   | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` | Port management & payments    |

#### Privacy Pool

| Contract                | Address                                      | Purpose                             |
| ----------------------- | -------------------------------------------- | ----------------------------------- |
| GaleonEntrypoint        | `0x54BA91d29f84B8bAd161880798877e59f2999f7a` | Main entry for deposits/withdrawals |
| GaleonPrivacyPoolSimple | `0x3260c8d8cc654B0897cd93cdf0662Fa679656b36` | Native MNT privacy pool             |
| WithdrawalVerifier      | `0x7529e3ec251A648A873F53d9969c1C05a44029A1` | ZK withdrawal proof verifier        |
| RagequitVerifier        | `0xFDb199E0aC8eC430541438aa6E63101F8C205D76` | ZK ragequit proof verifier          |
| PoseidonT3              | `0xAE4c25FF221d3aa361B39DA242357fa04420215D` | Poseidon hash library (3 inputs)    |
| PoseidonT4              | `0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45` | Poseidon hash library (4 inputs)    |

#### Configuration

| Parameter       | Value                                        |
| --------------- | -------------------------------------------- |
| Minimum Deposit | 0.01 MNT                                     |
| Vetting Fee     | 0%                                           |
| Max Relay Fee   | 5%                                           |
| Native Asset    | `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` |

---

## Contract Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐          ┌──────────────────┐             │
│  │  GaleonRegistry  │          │  GaleonEntrypoint │             │
│  │  (Stealth Addr)  │          │  (Privacy Pool)   │             │
│  └────────┬─────────┘          └────────┬─────────┘             │
│           │                             │                        │
│           │                             │                        │
│  ┌────────▼─────────┐          ┌────────▼─────────┐             │
│  │ ERC5564Announcer │          │ PrivacyPoolSimple │             │
│  │ ERC6538Registry  │          │ (per asset)       │             │
│  └──────────────────┘          └────────┬─────────┘             │
│                                         │                        │
│                                ┌────────▼─────────┐             │
│                                │    Verifiers     │             │
│                                │ Withdrawal/Ragequit│            │
│                                └──────────────────┘             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Role Hierarchy

| Role          | Holder   | Permissions                                              |
| ------------- | -------- | -------------------------------------------------------- |
| OWNER_ROLE    | Deployer | Register/remove pools, update config, upgrade, wind down |
| ASP_POSTMAN   | Deployer | Update ASP roots                                         |
| DEFAULT_ADMIN | N/A      | Controlled by OWNER_ROLE                                 |

---

## Owner Operations

### Update ASP Root

Called periodically to update the Association Set Provider root. **This is handled automatically by the API service** via the `UpdateASPRoot` scheduled job (runs every 30 seconds).

**Automatic (Recommended):** Configure the API with:

```env
ENTRYPOINT_ADDRESS=0x54BA91d29f84B8bAd161880798877e59f2999f7a
# Uses RELAYER_PRIVATE_KEY as fallback if ASP_POSTMAN_PRIVATE_KEY not set
```

Then run the scheduler: `node ace scheduler:run`

**Manual (if needed):**

```solidity
// ABI
function updateRoot(uint256 _root, string memory _ipfsCID) external

// Example (hardhat console)
const entrypoint = await ethers.getContractAt("GaleonEntrypoint", "0x54BA91d29f84B8bAd161880798877e59f2999f7a");
await entrypoint.updateRoot(
    "21663839004416932945382355908790599225266501822907911457504978515578255421292",
    "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi"
);
```

### Update Pool Configuration

```solidity
// ABI
function updatePoolConfiguration(
    IERC20 _asset,
    uint256 _minimumDepositAmount,
    uint256 _vettingFeeBPS,
    uint256 _maxRelayFeeBPS
) external

// Example: Update native pool to 0.1 MNT minimum, 1% vetting fee
const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
await entrypoint.updatePoolConfiguration(
    NATIVE,
    ethers.parseEther("0.1"),  // 0.1 MNT minimum
    100,                        // 1% vetting fee (100 BPS)
    500                         // 5% max relay fee (500 BPS)
);
```

### Withdraw Collected Fees

```solidity
// ABI
function withdrawFees(IERC20 _asset, address _recipient) external

// Example: Withdraw native fees to treasury
await entrypoint.withdrawFees(NATIVE, "0xYourTreasuryAddress");
```

### Wind Down Pool (Emergency)

Permanently disables new deposits. Use only in emergencies.

```solidity
// ABI
function windDownPool(IGaleonPrivacyPool _pool) external

// Example
await entrypoint.windDownPool("0x3260c8d8cc654B0897cd93cdf0662Fa679656b36");
```

---

## User Operations

### Deposit (Native MNT)

```solidity
// ABI
function deposit(uint256 _precommitment) external payable returns (uint256 _commitment)

// Example: Deposit 1 MNT
const precommitment = await generatePrecommitment(); // From @galeon/pool SDK
await entrypoint.deposit(precommitment, { value: ethers.parseEther("1") });
```

### Deposit (ERC20)

```solidity
// ABI
function deposit(
    IERC20 _asset,
    uint256 _value,
    uint256 _precommitment
) external returns (uint256 _commitment)

// Example: Deposit 100 USDC (requires prior approval)
const usdc = "0xUSDCAddress";
await usdcContract.approve(entrypointAddress, ethers.parseUnits("100", 6));
await entrypoint.deposit(usdc, ethers.parseUnits("100", 6), precommitment);
```

### Withdraw via Relay

```solidity
// ABI
function relay(
    IGaleonPrivacyPool.Withdrawal calldata _withdrawal,
    ProofLib.WithdrawProof calldata _proof,
    uint256 _scope
) external

// Withdrawal struct (existingNullifierHash and newCommitment are in proof pubSignals)
struct Withdrawal {
    address processooor;  // Must be entrypoint address
    bytes data;  // Encoded RelayData
}

// RelayData struct
struct RelayData {
    address recipient;
    address feeRecipient;
    uint256 relayFeeBPS;
}
```

---

## Adding ERC20 Pools

The architecture fully supports ERC20 tokens. To add a new token pool:

> **IMPORTANT: Entrypoint Upgrade Required for Merge Deposits**
>
> Before deploying ERC20 pools, ensure the Entrypoint has the ERC20 merge deposit fix.
> The fix (added Jan 2026) pulls ERC20 tokens from caller in `mergeDeposit()`.
> Without this fix, ERC20 merge deposits will revert.
>
> **Check if upgrade needed:**
>
> - If Entrypoint was deployed before Jan 2026, upgrade it first (see [Upgrading Contracts](#upgrading-contracts))
> - The fix is in `GaleonEntrypoint.mergeDeposit()` - it now calls `safeTransferFrom` for ERC20
>
> **Note:** This only affects ERC20 pools. Native MNT pools work without the upgrade.

### Step 1: Deploy New Pool

Use `GaleonPrivacyPoolComplex` for ERC20 tokens (not Simple, which is for native MNT only).

```typescript
const usdcAddress = '0x...' // ERC20 token address

const GaleonPrivacyPoolComplex = await ethers.getContractFactory('GaleonPrivacyPoolComplex', {
  libraries: {
    'poseidon-solidity/PoseidonT3.sol:PoseidonT3': '0xAE4c25FF221d3aa361B39DA242357fa04420215D',
    'poseidon-solidity/PoseidonT4.sol:PoseidonT4': '0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45',
  },
})

const pool = await upgrades.deployProxy(
  GaleonPrivacyPoolComplex,
  [
    owner,
    entrypointAddress,
    withdrawalVerifierAddress,
    ragequitVerifierAddress,
    galeonRegistryAddress,
  ],
  {
    kind: 'uups',
    constructorArgs: [
      entrypointAddress,
      withdrawalVerifierAddress,
      ragequitVerifierAddress,
      usdcAddress, // ERC20 token address (required for Complex)
    ],
    unsafeAllowLinkedLibraries: true,
    unsafeAllow: ['constructor', 'state-variable-immutable'],
  }
)
```

### Step 2: Register Pool

```typescript
const entrypoint = await ethers.getContractAt('GaleonEntrypoint', entrypointAddress)

await entrypoint.registerPool(
  usdcAddress, // ERC20 token address
  poolAddress, // New pool address
  ethers.parseUnits('10', 6), // Min deposit: 10 USDC
  0, // Vetting fee: 0%
  500 // Max relay fee: 5%
)
```

### Step 3: Update SDK

Add the new pool to `packages/pool/src/contracts.ts`:

```typescript
export const POOL_CONTRACTS = {
  5000: {
    native: {
      entrypoint: '0x54BA91d29f84B8bAd161880798877e59f2999f7a',
      pool: '0x3260c8d8cc654B0897cd93cdf0662Fa679656b36',
      // ...
    },
    usdc: {
      entrypoint: '0x54BA91d29f84B8bAd161880798877e59f2999f7a', // Same entrypoint
      pool: '0xNewUSDCPoolAddress',
      // ...
    },
  },
}
```

---

## Upgrading Contracts

Both Entrypoint and Pool use UUPS upgradeability.

### Upgrade Entrypoint

```typescript
const GaleonEntrypointV2 = await ethers.getContractFactory('GaleonEntrypointV2')
await upgrades.upgradeProxy('0x54BA91d29f84B8bAd161880798877e59f2999f7a', GaleonEntrypointV2, {
  kind: 'uups',
})
```

### Upgrade Pool

```typescript
const GaleonPrivacyPoolSimpleV2 = await ethers.getContractFactory('GaleonPrivacyPoolSimpleV2', {
  libraries: {
    'poseidon-solidity/PoseidonT3.sol:PoseidonT3': '0xAE4c25FF221d3aa361B39DA242357fa04420215D',
    'poseidon-solidity/PoseidonT4.sol:PoseidonT4': '0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45',
  },
})

await upgrades.upgradeProxy(
  '0x3260c8d8cc654B0897cd93cdf0662Fa679656b36',
  GaleonPrivacyPoolSimpleV2,
  {
    kind: 'uups',
    unsafeAllowLinkedLibraries: true,
    unsafeAllow: ['constructor', 'state-variable-immutable'],
  }
)
```

### Swap Verifier (No Pool Upgrade Needed)

If you need to update the ZK circuit:

1. Deploy new Verifier contract
2. Call pool's `setVerifier()` (if available) or upgrade pool

---

## Emergency Procedures

### 1. Pause Deposits (Wind Down)

```typescript
await entrypoint.windDownPool(poolAddress)
```

**Note:** This is irreversible. The pool will be marked as "dead" and no new deposits will be accepted. Existing funds can still be withdrawn.

### 2. Remove Pool

```typescript
await entrypoint.removePool(assetAddress)
```

This removes the pool from the registry but doesn't affect existing deposits.

### 3. Freeze Stealth Address (GaleonRegistry)

```typescript
const registry = await ethers.getContractAt('GaleonRegistry', registryAddress)
await registry.setFrozenStealthAddress(stealthAddress, true)
```

Prevents withdrawals to a specific address (compliance).

---

## GaleonRegistry Integration

The GaleonRegistry is the bridge between stealth address payments and the Privacy Pool. It tracks:

- **Port registrations** - Which stealth meta-addresses belong to registered Ports
- **Verified balances** - Funds received through `payNative()` / `payToken()` that can be deposited
- **Authorized pools** - Which Privacy Pools can consume verified balances

### Authorize Privacy Pool (REQUIRED)

**After deploying a new Privacy Pool, you MUST authorize it in GaleonRegistry:**

```bash
# Via Hardhat console
cd packages/contracts
npx hardhat console --network mantle
```

```typescript
const registry = await ethers.getContractAt(
  'GaleonRegistry',
  '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D'
)

// Authorize the native MNT pool
await registry.setAuthorizedPool('0x3260c8d8cc654B0897cd93cdf0662Fa679656b36', true)

// Verify authorization
await registry.authorizedPools('0x3260c8d8cc654B0897cd93cdf0662Fa679656b36')
// Should return: true
```

**Why is this required?**

The Privacy Pool calls `registry.consumeVerifiedBalance()` during deposits to:

1. Prevent deposits of "dirty" funds sent directly (not through Ports)
2. Prevent double-deposits by consuming the verified balance
3. Maintain audit trail of all pool deposits

Without authorization, deposits will revert with `"Not authorized pool"`.

### Check Registry State for a Stealth Address

```typescript
const registry = await ethers.getContractAt(
  'GaleonRegistry',
  '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D'
)
const stealthAddress = '0x...'

// Is this a valid Port stealth address?
await registry.isPortStealthAddress(stealthAddress)

// Can this address deposit to the pool?
await registry.canDeposit(stealthAddress)

// What's the verified balance? (address(0) = native MNT)
await registry.verifiedBalance(stealthAddress, '0x0000000000000000000000000000000000000000')

// Is this address frozen?
await registry.frozenStealthAddresses(stealthAddress)
```

### Block a Depositor (ASP Compliance)

```typescript
// Block address from depositing to pool (at deposit time)
const pool = await ethers.getContractAt(
  'GaleonPrivacyPoolSimple',
  '0x3260c8d8cc654B0897cd93cdf0662Fa679656b36'
)
await pool.updateBlocklist(depositorAddress, true)

// Freeze stealth address in registry (prevents any new deposits from that address)
const registry = await ethers.getContractAt(
  'GaleonRegistry',
  '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D'
)
await registry.setFrozenStealthAddress(stealthAddress, true)
```

---

## Verification Commands

### Verified Contracts

All contracts have been verified on Mantlescan:

| Contract                       | Address                                                                                       | Verified |
| ------------------------------ | --------------------------------------------------------------------------------------------- | -------- |
| WithdrawalVerifier             | [0x7529...A1](https://mantlescan.xyz/address/0x7529e3ec251A648A873F53d9969c1C05a44029A1#code) | ✓        |
| RagequitVerifier               | [0xFDb1...76](https://mantlescan.xyz/address/0xFDb199E0aC8eC430541438aa6E63101F8C205D76#code) | ✓        |
| PoseidonT3                     | [0xAE4c...5D](https://mantlescan.xyz/address/0xAE4c25FF221d3aa361B39DA242357fa04420215D#code) | ✓        |
| PoseidonT4                     | [0x95Ed...45](https://mantlescan.xyz/address/0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45#code) | ✓        |
| GaleonEntrypoint (impl)        | [0xbe48...18](https://mantlescan.xyz/address/0xbe482d5eddea5baea113f3716f696642a69cba18#code) | ✓        |
| GaleonPrivacyPoolSimple (impl) | [0x4549...e5](https://mantlescan.xyz/address/0x4549f8313dc760ea979fa885a94f77950fbcbce5#code) | ✓        |

### Verification Commands (Reference)

```bash
# Verifiers (no constructor args)
npx hardhat verify --network mantle 0x7529e3ec251A648A873F53d9969c1C05a44029A1
npx hardhat verify --network mantle 0xFDb199E0aC8eC430541438aa6E63101F8C205D76

# Libraries (no constructor args)
npx hardhat verify --network mantle 0xAE4c25FF221d3aa361B39DA242357fa04420215D
npx hardhat verify --network mantle 0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45

# Get implementation addresses for UUPS proxies
cast implementation 0x54BA91d29f84B8bAd161880798877e59f2999f7a --rpc-url https://rpc.mantle.xyz
cast implementation 0x3260c8d8cc654B0897cd93cdf0662Fa679656b36 --rpc-url https://rpc.mantle.xyz

# Entrypoint implementation (no constructor args)
npx hardhat verify --network mantle 0xbe482d5eddea5baea113f3716f696642a69cba18

# Pool implementation (with constructor args: entrypoint, withdrawalVerifier, ragequitVerifier)
npx hardhat verify --network mantle 0x4549f8313dc760ea979fa885a94f77950fbcbce5 \
  0x54BA91d29f84B8bAd161880798877e59f2999f7a \
  0x7529e3ec251A648A873F53d9969c1C05a44029A1 \
  0xFDb199E0aC8eC430541438aa6E63101F8C205D76
```

---

## Quick Reference

### Key Addresses

```
ENTRYPOINT: 0x54BA91d29f84B8bAd161880798877e59f2999f7a
NATIVE_POOL: 0x3260c8d8cc654B0897cd93cdf0662Fa679656b36
NATIVE_ASSET: 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
GALEON_REGISTRY: 0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D
```

### View Functions

```solidity
// Get latest ASP root
entrypoint.latestRoot() returns (uint256)

// Get pool by scope
entrypoint.scopeToPool(scope) returns (address)

// Get asset config
entrypoint.assetConfig(asset) returns (AssetConfig)

// Check if precommitment used
entrypoint.usedPrecommitments(precommitment) returns (bool)

// Get pool scope
pool.SCOPE() returns (uint256)

// Get current Merkle root
pool.currentRoot() returns (uint256)

// Get tree size
pool.currentTreeSize() returns (uint256)
```

---

## Support

- GitHub Issues: https://github.com/mateodaza/galeon/issues
- Mantlescan: https://mantlescan.xyz
