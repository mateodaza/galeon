# Stealth Library (packages/stealth) Progress

> Shared EIP-5564 stealth address cryptography
> Last updated: 2025-12-27

## Setup

- [x] Initialize package
- [x] Add @noble/curves ^2.0.1
- [x] Add @noble/hashes ^2.0.1
- [x] Set up TypeScript (tsup + tsc)
- [x] Set up Vitest + fast-check

## Core Modules

- [x] keys.ts - Key generation & derivation (HKDF with domain separation)
- [x] address.ts - Stealth address generation (with input validation)
- [x] scan.ts - Announcement scanning (with metadata bounds checking)
- [x] config.ts - Chain configuration (Mantle Sepolia/Mainnet)
- [x] types.ts - TypeScript types (StealthKeys, Announcement, etc.)
- [x] utils.ts - Hex/bytes utilities (with validation)
- [x] index.ts - Exports + createStealthClient

## Security Hardening (Audit Fixes - Round 1)

- [x] Hex validation in utils.ts (odd-length, invalid chars)
- [x] HKDF with domain separation in keys.ts (galeon-stealth-spending-v1, etc.)
- [x] Metadata bounds checking in scan.ts (skip malformed)
- [x] Input validation on all public APIs (key length checks)
- [x] Property-based tests with fast-check

## Security Hardening (Audit Fixes - Round 2)

- [x] Try/catch in scan loop for invalid curve points (prevents crash on adversarial announcements)
- [x] Ephemeral key scalar range validation in generateStealthAddressDeterministic ([1, n-1])
- [x] Explicit length checks in buildAnnouncementMetadata (32-byte receiptHash, 20-byte token)
- [x] Non-zero default salt for HKDF (avoids zero-salt footgun)

## Dual Prefix Support (Mantle Branding)

- [x] StealthChainPrefix type ('eth' | 'mnt')
- [x] StealthMetaAddress supports both st:eth: and st:mnt: prefixes
- [x] Default prefix is 'mnt' for Mantle branding
- [x] parseStealthMetaAddress returns chainPrefix
- [x] formatStealthMetaAddress accepts optional chainPrefix

## Tests

- [x] Property-based tests (fast-check) - 12 tests
- [ ] EIP-5564 test vectors
- [x] Key derivation tests (5 tests)
- [x] Address generation tests (3 tests)
- [x] Scanning tests (4 tests)
- [x] Configuration tests (3 tests)
- [x] Client tests (2 tests)

**Total: 30 tests passing**

## Documentation

- [x] JSDoc on all exports
- [ ] Usage examples in README

## API

### Key Functions

- `deriveStealthKeys(signature, chainPrefix?)` - Derive stealth keys from wallet signature (default: 'mnt')
- `derivePortKeys(masterSig, portIndex, chainPrefix?)` - Derive unique keys per Port
- `parseStealthMetaAddress(addr)` - Parse meta-address to public keys + chainPrefix
- `formatStealthMetaAddress(spend, view, chainPrefix?)` - Format public keys to meta-address

### Address Functions

- `generateStealthAddress(metaAddress)` - Generate stealth address for payment
- `generateStealthAddressDeterministic(metaAddress, ephemeralKey)` - Deterministic generation
- `computeViewTag(ephemeralPub, viewingPriv)` - Compute view tag
- `deriveStealthPrivateKey(ephemeralPub, spendingPriv, viewingPriv)` - Derive stealth private key

### Scanning Functions

- `scanAnnouncements(announcements, spendingKey, viewingKey)` - Scan for payments
- `checkAnnouncement(announcement, spendingKey, viewingKey)` - Check single announcement
- `buildAnnouncementMetadata(viewTag, receiptHash, token?, amount?)` - Build metadata bytes

### Client

- `createStealthClient(chainId)` - Create chain-specific client with all methods

## Notes

**EIP-5564 Scheme ID:** `0x01` (secp256k1 with view tags)

**Key resources:**

- EIP-5564: https://eips.ethereum.org/EIPS/eip-5564
- ERC-6538: https://eips.ethereum.org/EIPS/eip-6538

**@noble/curves 2.0 API changes:**

- Use `secp256k1.Point.Fn.ORDER` instead of `secp256k1.CURVE.n`
- Use `secp256k1.Point.BASE` instead of `secp256k1.ProjectivePoint.BASE`
- Use `point.toBytes(false)` instead of `point.toRawBytes(false)`
- Use `secp256k1.utils.randomSecretKey()` for random private keys
