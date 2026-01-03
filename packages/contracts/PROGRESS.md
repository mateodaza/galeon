# Contracts (packages/contracts) Progress

> Solidity smart contracts + Hardhat
> Last updated: 2025-12-27

## Setup

- [x] Initialize Hardhat
- [x] Configure for Mantle Sepolia + Mainnet
- [x] Set up OpenZeppelin
- [x] Create chain config

## Contracts

- [x] ERC5564Announcer.sol
- [x] ERC6538Registry.sol
- [x] GaleonRegistry.sol
- [x] GaleonTender.sol (renamed from BatchCollector)
- [x] IERC5564Announcer.sol (interface)
- [x] IERC6538Registry.sol (interface)

## Tests

- [x] ERC5564Announcer tests (17 tests)
- [x] ERC6538Registry tests (12 tests)
- [x] GaleonRegistry tests (39 tests)
- [x] GaleonTender tests (22 tests)
- [ ] Integration tests (optional)

**Total: 90 tests passing**

## Deployment

### Mantle Mainnet (chainId: 5000)

- [x] Deploy to Mantle Mainnet
- [x] Verify contracts on Mantlescan
- [x] Update @galeon/stealth config.ts

| Contract         | Address                                      | Verified |
| ---------------- | -------------------------------------------- | -------- |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` | ✓        |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` | ✓        |
| GaleonRegistry   | `0x85F23B63E2a40ba74cD418063c43cE19bcbB969C` | ✓        |
| GaleonTender     | `0x29D52d01947d91e241e9c7A4312F7463199e488c` | ✓        |

Explorer links:

- [ERC5564Announcer](https://mantlescan.xyz/address/0x8C04238c49e22EB687ad706bEe645698ccF41153#code)
- [ERC6538Registry](https://mantlescan.xyz/address/0xE6586103756082bf3E43D3BB73f9fE479f0BDc22#code)
- [GaleonRegistry](https://mantlescan.xyz/address/0x85F23B63E2a40ba74cD418063c43cE19bcbB969C#code)
- [GaleonTender](https://mantlescan.xyz/address/0x29D52d01947d91e241e9c7A4312F7463199e488c#code)

### Mantle Sepolia (chainId: 5003)

- [ ] Deploy to Mantle Sepolia (optional - using mainnet for hackathon)

## Notes

- Deployed directly to Mantle Mainnet for hackathon demo
- All contracts verified on Mantlescan
- Using EIP-5564 scheme ID 1 (secp256k1 with view tags)
- GaleonTender: Aggregates funds from stealth addresses and forwards to user wallets (future optimization, not used in MVP)

## Security Fixes (v2 Deployment)

- **Trusted Relayer System**: ERC5564Announcer now restricts `announceFor()` to trusted relayers only, preventing announcement spoofing
- **Reentrancy Protection**: GaleonTender uses ReentrancyGuard on forward functions
- **SafeERC20**: GaleonTender uses `safeTransfer` for ERC-20 operations
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

## 🚨 Operational Checklist for Production

### Pre-Deployment

- [ ] Deploy ERC5564Announcer and ERC6538Registry (already deployed on mainnet)
- [ ] Deploy GaleonRegistry with announcer/registry addresses
- [ ] Deploy GaleonEntrypoint proxy with owner/postman addresses
- [ ] Deploy Poseidon libraries (PoseidonT3, PoseidonT4)
- [ ] Deploy GaleonPrivacyPoolSimple proxy linked to Poseidon libraries

### Post-Deployment (CRITICAL)

- [ ] **Call `registry.setAuthorizedPool(poolAddress, true)`** - Deposits will revert without this!
- [ ] **Call `entrypoint.registerPool(asset, pool, minDeposit, vettingFeeBPS, maxRelayFeeBPS)`**
- [ ] **Call `entrypoint.updateRoot(root, cid)`** - Set initial ASP root
- [ ] Verify galeonRegistry is set on pool (deposits revert if unset)

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
