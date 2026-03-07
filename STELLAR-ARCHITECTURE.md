# Galeon on Stellar: Technical Architecture

**Stealth Addresses, Privacy Pools, and Compliance Reporting for Soroban**

Version 0.1 | March 2026

---

## 1. Overview

Galeon is privacy infrastructure for on-chain finance. The protocol combines stealth addresses (receiver privacy), Privacy Pools (sender privacy with compliance), and Shipwreck (selective disclosure for tax/audit) into a single stack.

The full protocol is deployed and working on EVM (Mantle mainnet). This document describes how each component maps to Stellar's Soroban runtime, what Protocol 25 primitives we use, where the architecture diverges from the EVM version, and what open questions remain.

---

## 2. Stealth Addresses on Stellar

### The Problem

On EVM, Galeon implements stealth addresses per EIP-5564/6538 using secp256k1 ECDH. Stellar uses ed25519 for all account keys. The stealth address scheme needs to be adapted to Curve25519.

### Approach: Ed25519 Stealth Derivation

The underlying math is equivalent — Diffie-Hellman key exchange on an elliptic curve — but the curve and encoding change.

**Recipient setup:**

1. Recipient derives a spending keypair `(s, S)` and viewing keypair `(v, V)` on ed25519 using HKDF from a wallet signature (same derivation pattern as EVM, different curve).

**Payment flow:**

1. Sender generates an ephemeral ed25519 keypair `(r, R)`.
2. Both parties convert their keys to X25519 for ECDH: `shared_secret = X25519(r_x25519, V_x25519)`. The ed25519-to-x25519 conversion is well-defined (RFC 7748, libsodium `crypto_sign_ed25519_sk_to_curve25519` / `crypto_sign_ed25519_pk_to_curve25519`).
3. Derive a scalar: `h = SHA-256(shared_secret)` (reduced mod the ed25519 group order).
4. Stealth public key: `P_stealth = S + h * G` (ed25519 point addition).
5. View tag: first byte of `h` — same 99.6% early-discard optimization as EVM.

**Recipient scanning:**

1. For each announcement event, convert the ephemeral public key to X25519 and compute `shared_secret = X25519(v_x25519, R_x25519)`.
2. Derive `h`, check view tag, derive stealth public key, compare.
3. If match: stealth private key = `s + h mod L` (ed25519 group order).

### Contract-Held Balances (Key Difference from EVM)

On Ethereum, any derived address can receive ETH directly — no account setup required. On Stellar, accounts need minimum XLM reserves and explicit creation. Creating a new Stellar account for every stealth payment is impractical.

Instead, the **stealth module contract holds funds** and maps stealth public keys to balances:

1. Sender calls `pay(stealth_pubkey, amount, ephemeral_pubkey, view_tag, metadata)` on the stealth contract.
2. The contract transfers tokens from the sender and stores `balance[stealth_pubkey] += amount`.
3. The contract emits an event with the ephemeral public key, view tag, and metadata (equivalent to EIP-5564 announcements).
4. Recipient scans events via Soroban RPC `getEvents`, finds matches, and calls `claim(stealth_pubkey, recipient)` to withdraw.

**Claim authorization:** The caller must prove they control the stealth private key. Because stealth keys have no on-chain Stellar account, the contract cannot use Soroban's `require_auth` (which requires an existing account). Instead, the contract verifies an ed25519 signature directly: `env.crypto().ed25519_verify(&stealth_pubkey, &message, &signature)`, where `message` covers the contract ID, function name, recipient, and a nonce to prevent replay. The stealth private key never leaves the client — only the signature is submitted.

This is cleaner than the EVM model — no dust amounts scattered across one-time addresses, no gas-inefficient collection transactions.

### Port System

Ports (named payment endpoints with per-Port key isolation) work identically to EVM. Each Port derives independent spending and viewing keys using HKDF with the Port index as salt. The only change is the underlying curve (ed25519 instead of secp256k1).

---

## 3. Privacy Pool on Soroban

### ZK Verification: CAP-0074 (BN254 Host Functions)

Protocol 25 (live on Stellar mainnet January 22, 2026) introduced native BN254 host functions via CAP-0074:

| Host Function               | Operation                      | EVM Equivalent   |
| --------------------------- | ------------------------------ | ---------------- |
| `bn254_g1_add`              | G1 point addition              | ecAdd (0x06)     |
| `bn254_g1_mul`              | G1 scalar multiplication       | ecMul (0x07)     |
| `bn254_multi_pairing_check` | Pairing check on G1/G2 vectors | ecPairing (0x08) |

These provide direct feature parity with Ethereum's EIP-196/197 precompiles. Galeon's existing Circom circuits compile to BN254, so the proving system ports without changing curves.

**Instruction budget:** Groth16 verification on BLS12-381 benchmarks at ~40M instructions out of Soroban's 100M limit per transaction. BN254 operations are generally cheaper than BLS12-381, so BN254 Groth16 verification should fit comfortably with headroom for surrounding contract logic (Merkle updates, nullifier storage, state transitions).

**Circuit reuse:** Existing Circom circuits (withdrawal proof, ragequit proof) remain unchanged. Nethermind's `circom2soroban` tool converts Circom verification keys and proof formats to Rust code callable from Soroban contracts. Client-side proof generation continues in WebAssembly.

### Poseidon Commitments: CAP-0075 (Permutation Primitives)

CAP-0075 adds two host functions:

- `poseidon_permutation` — standard Poseidon permutation
- `poseidon2_permutation` — optimized Poseidon2 variant

These are **permutation primitives**, not complete hash functions. The sponge construction (absorb inputs into state, apply permutation, squeeze output) is built in contract code. CAP-0075's design rationale: the permutation contains all cryptographic complexity, while the sponge is a simple state machine efficient to implement in guest code.

**Galeon's Poseidon constructions:**

| Construction          | Inputs                                      | Sponge Config                         |
| --------------------- | ------------------------------------------- | ------------------------------------- |
| Precommitment         | `PoseidonT3(nullifier, secret)`             | state=[0, in1, in2], t=3, rate=2      |
| Deposit commitment    | `PoseidonT4(value, label, precommitment)`   | state=[0, in1, in2, in3], t=4, rate=3 |
| Per-deposit nullifier | `PoseidonT4(masterNullifier, scope, index)` | state=[0, in1, in2, in3], t=4, rate=3 |
| Per-deposit secret    | `PoseidonT4(masterSecret, scope, index)`    | state=[0, in1, in2, in3], t=4, rate=3 |

Parameters must match the BN254 scalar field and the parameter set used by the Circom circuits (same round constants, MDS matrix, S-box degree). CAP-0075 supports configurable parameters and will provide presets for production parameter sets used in Circom.

### Merkle Tree

The state tree (32-depth Lean Incremental Merkle Tree with Poseidon hashes) is stored in Soroban persistent storage. Each node is a contract data entry. Soroban's storage model (instance/persistent/temporary) maps well here — tree nodes are persistent, recent roots can use temporary storage with TTL extension.

### Soroban Contract Architecture

```
StellarStealthModule          — stealth payments, balance tracking, event emission
StellarPrivacyPool            — deposits, commitment tree, verified balance consumption
StellarGroth16Verifier        — BN254 proof verification (generated via circom2soroban)
StellarASPMembership          — ASP allowlist Merkle tree, root updates
StellarEntrypoint             — deposit routing, withdrawal coordination, nullifier tracking
```

Key differences from EVM contracts:

| Concern        | EVM                         | Soroban                                                                    |
| -------------- | --------------------------- | -------------------------------------------------------------------------- |
| Account model  | Any address can receive ETH | Contract holds balances, maps to stealth pubkeys                           |
| Storage        | Mappings + state variables  | Persistent/temporary/instance data entries with TTL                        |
| Upgradeability | UUPS proxy pattern          | Soroban native contract upgrade (`update_current_contract_wasm`)           |
| Token handling | `SafeERC20` transfers       | Stellar Asset Contract (SAC) for XLM + issued assets                       |
| Event emission | Solidity events             | Soroban contract events (indexed topics + data)                            |
| Auth model     | `msg.sender`                | `require_auth` for accounts; `ed25519_verify` for accountless stealth keys |

### Deposit Flow (Stellar-adapted)

1. User claims funds from stealth module (proves they control a stealth key).
2. User calls `deposit(precommitment, amount)` on the entrypoint.
3. Entrypoint verifies: stealth pubkey is registered, verified balance is sufficient, precommitment is unique.
4. Commitment = `Poseidon(value, label, precommitment)` inserted into state tree.
5. Verified balance decremented. Label stored for ragequit.

### Withdrawal Flow (Stellar-adapted)

1. Client reconstructs state tree from contract events.
2. Client fetches latest ASP root from entrypoint.
3. Client generates Groth16 proof (WebAssembly, same Circom circuits as EVM).
4. Proof sent to relayer, which calls `withdraw(proof, publicInputs, recipient)` on the entrypoint.
5. Entrypoint calls Groth16 verifier via BN254 host functions (CAP-0074).
6. On success: nullifier marked spent, new commitment inserted for remaining balance, funds transferred to recipient via SAC.

---

## 4. Relayer Adaptation

The relayer submits withdrawal transactions on behalf of users so the user's address never appears on-chain.

**Stellar-specific changes:**

- Transaction construction uses Stellar SDK instead of ethers/viem.
- Fee model: Stellar fees are per-operation (base fee + resource fees for Soroban), not gas-based. The relayer pays resource fees and deducts a fee from the withdrawal amount.
- Authorization: the relayer signs the transaction envelope. The withdrawal proof itself specifies the recipient — the relayer cannot redirect funds.
- Fallback: if the relayer is offline, users can submit directly (losing sender privacy) or ragequit (recovering deposit publicly).

Trust properties are identical to EVM: the relayer cannot steal funds, cannot modify withdrawal amounts, can only submit or refuse.

---

## 5. Event Indexing

Stealth address scanning and state tree reconstruction require historical event data.

**Soroban RPC `getEvents`:** default node retention is ~24 hours, with up to 7 days available on supported providers. Sufficient for real-time scanning and testnet development, but not for long-term historical reconstruction on mainnet.

**Development phase (T1/T2):** Direct RPC `getEvents` calls. Testnet activity is low-volume and recent, so 7-day retention covers all scanning and state reconstruction needs.

**Production phase (T3):** Mercury or SubQuery indexer for persistent historical data.

- **Mercury** — Stellar-native indexer with Soroban event support. Subscription-based.
- **SubQuery** — general-purpose blockchain indexer with Stellar support.

The indexer processes:

- Stealth payment events (ephemeral pubkey, view tag, metadata) for recipient scanning.
- Deposit events (commitment, label, depositor) for state tree reconstruction.
- Withdrawal events (nullifier hash, new commitment) for state tree updates.
- ASP root update events for compliance verification.

---

## 6. Shipwreck Compliance Layer

Shipwreck generates tax/audit reports from on-chain data combined with the user's Port records.

**Stellar data sources:**

- Soroban contract events (stealth payments, deposits, withdrawals) — via RPC `getEvents` during development, via indexer (Mercury/SubQuery) in production.
- Horizon API for classic transaction data and timestamps.
- User's Port records (amounts, dates, labels) stored client-side or in the API backend.

The report generation logic is identical to EVM — only the data source adapters change. PDF export, jurisdiction formatting (US/Colombia), and selective disclosure mechanics are unchanged.

---

## 7. Instruction Budget Analysis

| Operation                    | Estimated Instructions | Source                                                |
| ---------------------------- | ---------------------- | ----------------------------------------------------- |
| Groth16 verification (BN254) | < 40M                  | BLS12-381 benchmarked at ~40M; BN254 expected cheaper |
| Surrounding contract logic   | ~10-20M                | Merkle updates, nullifier storage, state transitions  |
| Total per withdrawal         | ~50-60M                | Within 100M limit                                     |
| Headroom                     | ~40-50M                | Buffer for edge cases                                 |

The ~40M figure comes from SDF's Privacy Pools prototype (BLS12-381). BN254 pairing is generally cheaper, but exact BN254 instruction costs under CAP-0074's metering are not yet published. The contingency budget accounts for this uncertainty.

---

## 8. Prior Art on Stellar

Two existing prototypes inform Galeon's Stellar implementation:

**Nethermind stellar-private-payments** (most directly relevant):

- `circom2soroban` tool for converting Circom outputs to Soroban Rust code
- 4 contracts: Pool, Circom Groth16 Verifier, ASP Membership (Merkle tree), ASP Non-Membership (sparse Merkle tree). Galeon uses only the membership (allowlist) pattern.
- 2-input / 2-output UTXO circuit compiled with Circom
- Browser-based proving via WebAssembly
- Uses BLS12-381 (Galeon uses BN254 via CAP-0074, so verifier code differs but the `circom2soroban` pattern applies)

**SDF Privacy Pools prototype:**

- Published on stellar.org/blog
- Inspired by 0xbow framework
- Groth16 + BLS12-381
- Implements Association Set Providers (ASPs) for compliance
- Mixer contract with Merkle tree, Circom circuits

Neither prototype includes stealth addresses or compliance reporting. Galeon adds both.

---

## 9. Open Questions and Risks

| Risk                                              | Severity | Mitigation                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BN254 instruction costs higher than expected      | Medium   | Feasibility gate in T1: measure actual BN254 costs and publish instruction budget report before proceeding. Contingency budget for circuit optimization sprint. Fallback: pivot to BLS12-381 (proven on Soroban via SDF prototype) with circuit recompilation. |
| Poseidon sponge parameter compatibility           | Medium   | Must match Circom circuit parameters exactly. Feasibility gate in T1: verify sponge outputs match EVM implementation before proceeding to T2 deposit flow.                                                                                                     |
| Ed25519 stealth key derivation edge cases         | Low      | The curve math is well-understood. Libsodium's ed25519↔x25519 conversion is battle-tested.                                                                                                                                                                     |
| Soroban storage costs for Merkle tree             | Low      | 32-depth tree = 32 nodes per proof path. Persistent storage with TTL management keeps costs bounded.                                                                                                                                                           |
| RPC event retention (~24hr default, up to 7 days) | Low      | Sufficient for testnet dev (T1/T2) with tightly bounded test windows. Mercury or SubQuery indexer for mainnet historical data (T3). Budget includes indexer costs.                                                                                             |

---

## 10. References

- CAP-0074 (BN254): https://github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md
- CAP-0075 (Poseidon): https://github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md
- Protocol 25 announcement: https://stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
- Nethermind stellar-private-payments: https://github.com/NethermindEth/stellar-private-payments
- SDF Privacy Pools prototype: https://stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar
- Ed25519 to X25519 conversion: https://libsodium.gitbook.io/doc/advanced/ed25519-curve25519
- RFC 7748 (X25519): https://www.rfc-editor.org/rfc/rfc7748
- Soroban token interface: https://developers.stellar.org/docs/tokens/token-interface
- Privacy Pools paper (Buterin et al.): https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364
- EIP-5564 (Stealth Addresses): https://eips.ethereum.org/EIPS/eip-5564
