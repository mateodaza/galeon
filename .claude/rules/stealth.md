---
paths: packages/stealth/**/*.ts
---

# Stealth Library (@galeon/stealth)

Shared EIP-5564 stealth address cryptography.

## Dependencies

- @noble/curves (secp256k1)
- @noble/hashes (keccak256, HKDF)

## Structure

```
src/keys.ts      # Key derivation
src/address.ts   # Stealth address generation
src/scan.ts      # Announcement scanning
src/config.ts    # Chain configuration
src/types.ts     # TypeScript types
```

## Rules

- Property-based tests with fast-check
- Test against EIP-5564 test vectors
- No side effects in pure functions
- Export all types explicitly
