# Galeon Private Send (Fog Mode) - DEPRECATED

> ⚠️ **DEPRECATED:** This spec has been replaced by the Privacy Pool architecture.

## Current Approach

See the following documents for the current implementation:

- [FOG-SHIPWRECK-PLAN.md](./FOG-SHIPWRECK-PLAN.md) - Privacy Pool + Shipwreck implementation plan
- [PRIVACY_POOLS_SPEC.md](./PRIVACY_POOLS_SPEC.md) - 0xbow fork specification

## Key Architecture Change

**Old (fog wallets):**

```
Alice → Fog A → Fog B → Bob (multi-hop stealth addresses)
```

**New (Privacy Pool):**

```
Port → Pool (deposit) → Recipient (withdraw with ZK proof)
```

## Why We Changed

| Old Approach (Fog Wallets)             | New Approach (Privacy Pool)       |
| -------------------------------------- | --------------------------------- |
| Heuristic privacy (timing correlation) | Cryptographic privacy (ZK proofs) |
| Multi-hop complexity                   | Single pool, clean abstraction    |
| `deriveFogKeys()` function needed      | Standard `derivePortKeys()` only  |
| Intermediate addresses traceable       | No intermediate addresses needed  |
| Amount fingerprinting possible         | Variable amounts in pool          |

## What Was Removed

- `deriveFogKeys()` - No longer needed (use Privacy Pool instead)
- Fog wallet storage/recovery - Replaced by Pool notes
- Multi-hop scheduling - Pool handles mixing
- Backend fog delegation - Not needed with instant ZK proofs

## Migration

If you have old fog wallet code:

1. Remove any `deriveFogKeys()` calls
2. Use Privacy Pool for sender privacy instead
3. Store Pool notes (commitment, nullifier, secret) instead of fog wallet metadata

---

_Original spec archived. Contact team for historical reference if needed._
