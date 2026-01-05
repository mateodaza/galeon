# Contracts (packages/contracts) Progress

> Solidity smart contracts + Hardhat
> Last updated: 2026-01-04

## Setup

- [x] Initialize Hardhat
- [x] Configure for Mantle Sepolia + Mainnet
- [x] Set up OpenZeppelin
- [x] Create chain config

## Contracts

- [x] ERC5564Announcer.sol
- [x] ERC6538Registry.sol
- [x] GaleonRegistry.sol (+ Privacy Pool integration: verifiedBalance, canDeposit, freeze)
- [x] IERC5564Announcer.sol (interface)
- [x] IERC6538Registry.sol (interface)

## Tests

- [x] ERC5564Announcer tests (17 tests)
- [x] ERC6538Registry tests (12 tests)
- [x] GaleonRegistry tests (39 tests)
- [ ] Integration tests (optional)

**Base contracts: 68 tests passing**

See [Privacy Pool v1](#privacy-pool-v1-0xbow-fork) section below for additional 137 tests.

**Grand Total: 205 tests passing**

## Deployment

### Mantle Mainnet (chainId: 5000)

- [x] Deploy to Mantle Mainnet
- [x] Verify contracts on Mantlescan
- [x] Update @galeon/stealth config.ts

| Contract         | Address                                      | Verified |
| ---------------- | -------------------------------------------- | -------- |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` | ✓        |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` | ✓        |
| GaleonRegistry   | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` | ✓        |

Explorer links:

- [ERC5564Announcer](https://mantlescan.xyz/address/0x8C04238c49e22EB687ad706bEe645698ccF41153#code)
- [ERC6538Registry](https://mantlescan.xyz/address/0xE6586103756082bf3E43D3BB73f9fE479f0BDc22#code)
- [GaleonRegistry](https://mantlescan.xyz/address/0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D#code)

### Mantle Sepolia (chainId: 5003)

- [ ] Deploy to Mantle Sepolia (optional - using mainnet for hackathon)

## Notes

- Deployed directly to Mantle Mainnet for hackathon demo
- All contracts verified on Mantlescan
- Using EIP-5564 scheme ID 1 (secp256k1 with view tags)

## Security Fixes (v2 Deployment)

- **Trusted Relayer System**: ERC5564Announcer now restricts `announceFor()` to trusted relayers only, preventing announcement spoofing
- **Reentrancy Protection**: GaleonRegistry uses ReentrancyGuard on payment functions
- **SafeERC20**: GaleonRegistry uses `safeTransfer` for ERC-20 operations
- **Pubkey Validation**: GaleonRegistry validates ephemeral public key prefix (0x02/0x03)
- **Correct Attribution**: Announcements correctly attribute the payer via `announceFor()`

## Documentation

- [x] README.md with full API reference, deployment addresses, and examples

---

## Privacy Pool v1 (0xbow Fork)

### Contracts

- [x] GaleonEntrypoint.sol - Main entrypoint for deposits, ASP roots, pool registry
- [x] GaleonPrivacyPool.sol - Abstract pool with Port-only deposits + verifiedBalance gating
- [x] GaleonPrivacyPoolSimple.sol - Native currency (MNT/ETH) pool
- [x] GaleonPrivacyPoolComplex.sol - ERC-20 token pool
- [x] GaleonState.sol - Merkle tree state management
- [x] GaleonASP.sol - Association Set Provider (unused for now)
- [x] MockVerifier.sol, MockGaleonRegistry.sol - Test mocks

### Tests

- [x] GaleonEntrypoint tests (68 tests)
- [x] GaleonPrivacyPoolSimple tests (46 tests)
- [x] GaleonPrivacyPoolComplex tests (23 tests)

**Total: 216 tests passing**

### Galeon Modifications from 0xbow

1. **UUPS Upgradeability** - All pools/entrypoint are upgradeable proxies
2. **Port-Only Deposits** - Only stealth addresses from GaleonRegistry can deposit
3. **Verified Balance Gating** - Prevents dirty direct sends and double-deposits
4. **Stealth Address Freezing** - Freeze addresses when ports deactivated
5. **SCOPE per proxy** - Each proxy has unique SCOPE for proof domain separation
6. **Verifier swapping** - Verifiers can be upgraded without redeployment

---

### Privacy Pool Deployment (Mantle Mainnet)

| Contract                 | Address                                      | Type        |
| ------------------------ | -------------------------------------------- | ----------- |
| PoseidonT3               | `0x1130c821a709e5D414684a7605F5D1f6E7439Ff2` | Library     |
| PoseidonT4               | `0x669b0039263C3dBF1c2c5726A378433759Fa0df1` | Library     |
| MockVerifier             | `0x2B2A0A556C29DD43521de61ffB6fF1A78ca13940` | Placeholder |
| GaleonEntrypoint (proxy) | `0x1767D6A8e6942fdc88cD4BFbFE6796D9D5FbaF2f` | UUPS Proxy  |
| GaleonPrivacyPoolSimple  | `0x11021e2C1BE35AcCFE9Aa33862Cfb7e54E2036Ef` | UUPS Proxy  |

**Pool SCOPE:** `3813115185232120460597786926146817949248386022022309247081941950024775602883`

---

## 🚨 Operational Checklist for Production

### Pre-Deployment

- [x] Deploy ERC5564Announcer and ERC6538Registry (already deployed on mainnet)
- [x] Deploy GaleonRegistry with announcer/registry addresses
- [x] Deploy GaleonEntrypoint proxy with owner/postman addresses
- [x] Deploy Poseidon libraries (PoseidonT3, PoseidonT4)
- [x] Deploy GaleonPrivacyPoolSimple proxy linked to Poseidon libraries

### Post-Deployment (CRITICAL)

- [x] **Call `registry.setAuthorizedPool(poolAddress, true)`** - Deposits will revert without this!
- [x] **Call `entrypoint.registerPool(asset, pool, minDeposit, vettingFeeBPS, maxRelayFeeBPS)`**
- [x] **Call `entrypoint.updateRoot(root, cid)`** - Set initial ASP root
- [x] Verify galeonRegistry is set on pool (deposits revert if unset)

### Key Addresses for Ownership

| Contract          | Owner Should Be   | Purpose                                |
| ----------------- | ----------------- | -------------------------------------- |
| GaleonRegistry    | Timelock/Multisig | Can authorize pools, freeze addresses  |
| GaleonEntrypoint  | Timelock/Multisig | Can register/remove pools, update fees |
| GaleonPrivacyPool | Timelock/Multisig | Can upgrade verifiers, set registry    |

### Operational Functions

| Function                                 | Contract   | When to Use                                 |
| ---------------------------------------- | ---------- | ------------------------------------------- |
| `setAuthorizedPool(pool, bool)`          | Registry   | After deploying new pool                    |
| `setFrozenStealthAddress(addr, bool)`    | Registry   | When deactivating port or compliance freeze |
| `updateBlocklist(addr, bool)`            | Pool       | ASP-level address blocking                  |
| `upgradeVerifiers(withdrawal, ragequit)` | Pool       | Circuit upgrades                            |
| `updateRoot(root, cid)`                  | Entrypoint | ASP root updates                            |

### Monitoring Events

| Event                       | Contract | Monitor For                |
| --------------------------- | -------- | -------------------------- |
| `VerifiedBalanceConsumed`   | Registry | Deposits consuming balance |
| `StealthAddressFrozen`      | Registry | Compliance actions         |
| `PrivacyPoolAuthorized`     | Registry | New pool authorizations    |
| `Deposited`                 | Pool     | Successful deposits        |
| `DepositorBlocklistUpdated` | Pool     | ASP blocklist changes      |

### Security Invariants

1. **galeonRegistry must be non-zero** - Pool reverts with `GaleonRegistryNotSet` otherwise
2. **Pool must be authorized** - Registry reverts with "Not authorized pool" otherwise
3. **verifiedBalance must be sufficient** - Pool reverts with `InsufficientVerifiedBalance` otherwise
4. **Owner keys must be secured** - Use timelock/multisig for all owner addresses

---

## Privacy Pool v2 - Account Model (Planned)

**Spec:** [docs/FOG_PORT_POOL_SPEC.md](/docs/FOG_PORT_POOL_SPEC.md)

### Overview

Upgrade to Account Model architecture for O(1) withdrawals regardless of deposit history.

### Circuit (Completed 2026-01-04)

- [x] `mergeDeposit.circom` - Merge new deposit into existing commitment
  - File: `packages/0xbow/packages/circuits/circuits/mergeDeposit.circom`
  - Public signals: depositValue, stateRoot, stateTreeDepth, ASPRoot, ASPTreeDepth, context
  - Outputs: newCommitmentHash, existingNullifierHash
  - Added to `circuits.json` configuration
  - Build scripts added to package.json

### Contract Changes (Completed 2026-01-04)

- [x] Add `MERGE_DEPOSIT_VERIFIER` to GaleonState
- [x] Add `mergeDeposit()` function to GaleonPrivacyPool
- [x] Add `MergeDepositProof` struct to ProofLib with accessor functions
- [x] Add `validMergeDeposit` modifier for proof validation
- [x] Add `_setMergeDepositVerifier()` internal function
- [x] Add `MergeDeposited` event to IGaleonPrivacyPool
- [x] Add `MergeDepositVerifierNotSet` error

### Remaining Tasks

- [x] Compile mergeDeposit circuit (17,655 constraints, 220 template instances)
- [x] Generate trusted setup keys (dev keys via circomkit)
- [x] Generate MergeDepositVerifier.sol
- [ ] Deploy verifier contract
- [ ] Call `_setMergeDepositVerifier()` on pool

---

## Circuit Setup Operations (One-Time)

### Prerequisites

- Node.js 20+
- circom 2.2.0+ via Rust: `cargo install --git https://github.com/iden3/circom.git --force`
- ~2GB disk space for ptau file

### Setup (Clone 0xbow repo for isolated build)

Since 0xbow is a submodule excluded from workspace, clone it separately:

```bash
cd /tmp
git clone https://github.com/0xbow-io/privacy-pools-core.git
cd privacy-pools-core/packages/circuits
yarn install
yarn setup:ptau
```

### Configure circomkit

```bash
# Fix circomkit.json include format
cat > circomkit.json << 'EOF'
{
  "version": "2.1.2",
  "proofSystem": "groth16",
  "curve": "bn128",
  "include": ["./node_modules/circomlib/circuits", "./node_modules/maci-circuits/circom"]
}
EOF

# Add circuit to circuits.json
cat > circuits.json << 'EOF'
{
  "mergeDeposit": {
    "file": "mergeDeposit",
    "template": "MergeDeposit",
    "params": [32],
    "pubs": ["depositValue", "stateRoot", "stateTreeDepth", "ASPRoot", "ASPTreeDepth", "context"]
  }
}
EOF
```

### Copy mergeDeposit.circom

```bash
cp /path/to/galeon/packages/0xbow/packages/circuits/circuits/mergeDeposit.circom ./circuits/
```

### Build & Generate Verifier

```bash
npx circomkit setup mergeDeposit    # Compiles + trusted setup
npx circomkit vkey mergeDeposit     # Export verification key
npx circomkit contract mergeDeposit # Generate Solidity verifier
```

### Copy to Galeon

```bash
cp build/mergeDeposit/Groth16Verifier.sol /path/to/galeon/packages/contracts/contracts/privacy-pool/verifiers/MergeDepositVerifier.sol
```

Then fix the pragma and contract name in the copied file.

### Notes

- **Trusted setup is per-circuit**: Each circuit needs its own setup
- **Dev keys vs Production**: These are development keys. For production, run a multi-party ceremony
- **ptau file**: Reused across circuits - only download once
- **mergeDeposit stats**: 17,655 non-linear constraints, 220 template instances

---

### Key Changes from v1

| Aspect      | v1                            | v2                            |
| ----------- | ----------------------------- | ----------------------------- |
| Deposits    | Each creates new commitment   | Merges into single commitment |
| Withdrawals | O(N) - need multi-input proof | O(1) - always single proof    |
| Label       | New per deposit               | Preserved from first deposit  |
| Ragequit    | No ASP check                  | ASP-gated (banned = frozen)   |

### Storage Layout

No breaking changes - new verifier added alongside existing ones.

```solidity
// Existing
IVerifier public WITHDRAWAL_VERIFIER;
IVerifier public RAGEQUIT_VERIFIER;

// New
IVerifier public MERGE_DEPOSIT_VERIFIER;
```

### Deployment Plan

1. Compile mergeDeposit circuit
2. Generate dev proving keys (trusted setup)
3. Deploy MergeDepositVerifier
4. Upgrade GaleonPrivacyPoolSimple to include mergeDeposit()
5. Call `_upgradeVerifiers()` with new verifier address
