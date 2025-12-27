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
