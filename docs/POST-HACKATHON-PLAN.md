# Post-Hackathon Plan (Production Hardening)

## Scope

This document outlines the work to take Galeon from hackathon-ready to production-ready at scale. It assumes the current account-model pool design (mergeDeposit), registry + ASP compliance, and UUPS upgradeability.

## Immediate Priorities (P0/P1)

- **MergeDeposit delivery**: finalize circuit + verifier (trusted setup), extend `_upgradeVerifiers` to include merge, upgrade pool/entrypoint, and wire frontend/indexer.
- **ASP ops**: define root update cadence; clients fetch latest root and retry on staleness; monitor root age/failure rates; add an auto-approve service for hackathon/demo if needed.
- **Proof infra**: stand up a prover service (GPU/worker pool, job queue, retries, timeouts) with telemetry and autoscaling; benchmark proof times per circuit change.
- **Concurrency handling**: per-label/user locking or retry/backoff to handle nullifier races in merge/withdraw flows.
- **Indexer/recovery**: paginated endpoints, SSE/WS, “latest active commitment per label” API; load-test public endpoints (/announcements, /deposits) and add rate limits/caching; ensure depositor filters.
- **Governance/keys**: multisig/timelock for upgrades; restrict sensitive actions (`setAuthorizedPool`, ASP updates, registry auth); add pause/kill switches.

## Medium-Term (P2)

- **Tree lifecycle**: document depth=32 (~4.3B leaves) capacity and design a rollover/checkpoint mechanism (carry balances into a new tree) to handle state growth before it’s an issue.
- **Batching/throughput**: explore off-chain aggregation or batching to reduce on-chain inserts/gas; set fee/tip guidance based on measured gas on Mantle.
- **ASP/registry performance**: optimize `verifiedBalance` checks/consumption; define operational cadence for ASP roots to balance freshness vs. staleness retries.
- **Recovery/migration UX**: detect legacy commitments and guide withdraw/redeposit into the account model; add UI for frozen labels, staleness retries, batching guidance.
- **Monitoring/observability**: metrics and alerts for proof failures, root staleness, gas spikes, unusual registry/ASP events, indexer lag.

## Longer-Term (P3 / Nice-to-Have)

- **Alternative proving systems**: evaluate PLONK/KZG or setup-light systems to ease future circuit iterations.
- **Key rotation/recovery**: design social recovery or key rotation for pool keys; currently unsupported.
- **Multi-asset/multi-tree support**: refactor contracts/indexer/SDK to handle multiple pools/trees cleanly with asset-scoped roots and recovery.
- **Rollover implementation**: build and test the checkpoint/migration path when approaching tree/state limits.

## Security & Compliance

- External audits (contracts + circuits) before mainnet scale; add invariant/property tests for balance preservation, label binding, verifiedBalance consumption.
- Clarify ragequit policy (ASP-checked or not) and enforce consistently; disclose in UX.
- Verify contracts on-chain; keep manifests/addresses in shared config; lock down admin keys in multisig.

## Throughput Reality Check

- Merge/withdraw ~250–300k gas; practical throughput on Mantle is in the low double digits TPS. At 10–20 ops/sec that’s ~25–50M ops/month. For higher volume, batching/rollups and tree rollover will be required.

## Current Known Limits

- Tree depth fixed at 32 (~4.3B leaves per pool). One leaf per deposit/merge; state grows unbounded without rollover.
- Trusted setup per circuit; verifier upgrades require governance.
- Single active commitment per user → concurrent ops can race; mitigated via retries/locking.

## Next Steps

1. Deliver P0s (merge circuit/verifier, contract upgrade, ASP ops, prover service bootstrapping).
2. Add observability, rate limits, and retry logic in clients.
3. Define and document tree rollover plan; defer implementation until volume demands it.
4. Schedule external audit before production deployment.
