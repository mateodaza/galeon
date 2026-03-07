# Pre-Demo Sanity Checklist

End-to-end tests to run before the hackathon demo.

## 1. One-Port Flow (Collect → Deposit)

- [ ] Scan payments on a single port
- [ ] Verify some payments show as skipped (too small for gas)
- [ ] Click "Deposit All" and watch progress UI
- [ ] Confirm partial success handling works (if any fail)
- [ ] Verify final `forceSync` state matches on-chain

## 2. Cross-Port Flow

- [ ] `/collect` totals match sum of individual `/collect/[id]` pages
- [ ] Skipped payment messaging is consistent across both views
- [ ] Collapsible "Payments Below Minimum" works on both pages

## 3. Withdrawal Flow

- [ ] Navigate to `/pool` page
- [ ] Verify pool balance shows correctly after deposits
- [ ] Enter withdrawal amount and recipient address
- [ ] Click withdraw and watch proof generation
- [ ] Confirm tx submits and completes
- [ ] Verify recipient received funds
- [ ] Verify pool balance updated correctly
- [ ] Check nullifier was recorded (prevents double-spend)

## 4. Error Path

- [ ] Simulate stale ASP root or indexer lag
- [ ] Confirm retry/sync panel shows with 4 checkboxes (Indexer, ASP Tree, State Tree, Deposit)
- [ ] Auto-retry countdown works
- [ ] Manual "Refresh" button works
- [ ] User doesn't get stuck - can proceed after sync catches up

## 5. Gas Headroom Validation

- [ ] Run 2-3 real merge deposit txs
- [ ] Check actual gas used vs 0.055 MNT reserve
- [ ] Adjust `POOL_GAS_COST_PER_DEPOSIT` in `apps/web/hooks/use-collection.ts:2075` if needed

## Key Files

- Gas constant: `apps/web/hooks/use-collection.ts` line 2075
- Pool stats calculation: `calculatePoolDepositStats` in same file
- Collect pages: `apps/web/app/collect/page.tsx` and `apps/web/app/collect/[id]/page.tsx`
- Pool page (withdraw): `apps/web/app/pool/page.tsx`
- Pool context (merge deposit + withdraw logic): `apps/web/contexts/pool-context.tsx`

## 6. Future: Shipwreck Functionality

Shipwreck = recovery mechanism for users who lose access but have their master keys.

- [ ] Implement shipwreck recovery UI on `/pool` or dedicated `/recover` page
- [ ] Allow user to scan for all deposits using master keys only
- [ ] Recover deposits even without local state (rebuild from chain events)
- [ ] Handle edge cases:
  - [ ] Partially spent commitments (follow merge chain)
  - [ ] Multiple withdrawal children from same parent
  - [ ] Commitments that were fully withdrawn (show as "spent")
- [ ] Show recovery summary: total recoverable vs already spent
- [ ] Test with fresh browser/cleared localStorage

### Implementation Notes

- Use `recoverPoolDeposits()` from `@galeon/pool` for initial deposits
- Use `traceMergeChain()` to follow deposit → merge → withdrawal chains
- Use `recoverMergeDeposit()` and `recoverWithdrawalChange()` for child commitments
- Key files:
  - Recovery logic: `packages/pool/src/recovery.ts`
  - Pool context recovery: `apps/web/contexts/pool-context.tsx` (`recoverDeposits`)

## Notes

- Current gas reserve: 0.055 MNT per merge deposit
- Based on observed Mantle gas (~1.86B gas units at ~2.1B limit)
- Successful deposit tx example: `0x441350ca...`
