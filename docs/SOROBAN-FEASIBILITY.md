# Soroban Feasibility — Galeon on Stellar

Fact-checked March 2026 for the SCF Build Award submission (SCF #42).

---

## All 6 claims: TRUE

| Claim                                  | Verdict        | Key Caveat                                                                                                    |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------- |
| Protocol 25 BN254 host functions       | TRUE           | Mainnet live Jan 22, 2026. Cost calibration TBD. CAP-0074 (Final).                                            |
| Groth16 on Soroban                     | TRUE           | ~40M of 100M instruction budget (BLS12-381 measured). BN254 likely cheaper but not yet benchmarked.           |
| Poseidon/Poseidon2 host functions      | TRUE (nuanced) | They are **permutation primitives**, not complete hash functions. CAP-0075. Devs build sponge on top.         |
| Stellar Privacy Pools prototypes exist | TRUE           | Two: (1) Yan Michalevsky / SDF blog prototype, (2) Nethermind stellar-private-payments. Both early/unaudited. |
| RPC events for indexing                | TRUE           | Default 24hr retention. Need Mercury/SubQuery for historical.                                                 |
| Groth16 fits instruction budget        | TRUE           | 40M of 100M = 40%. 60% headroom for contract logic.                                                           |

---

## Protocol 25 (X-Ray) — What we use

Protocol 25 went live on Stellar mainnet January 22, 2026. Two CAPs are directly relevant:

### CAP-0074 — BN254 Host Functions

Adds three host functions:

- `bn254_g1_add` — adds two G1 points
- `bn254_g1_mul` — multiplies a G1 point by a scalar (Fr)
- `bn254_multi_pairing_check` — pairing check on vectors of G1/G2 points

These mirror Ethereum's EIP-196/197 precompiles. Ten new metering cost types introduced (e.g., `Bn254G1Add`, `Bn254G1Mul`, `Bn254Pairing`). Final calibration numbers are TBD.

### CAP-0075 — Poseidon/Poseidon2 Permutation Primitives

Adds two host functions:

- `poseidon_permutation` — standard Poseidon permutation
- `poseidon2_permutation` — optimized Poseidon2 permutation

**Critical nuance:** these are permutation primitives, not complete hash functions. Developers must construct sponge-based hash functions on top (absorb input into state, apply permutation, squeeze output). Both operate on field elements from BLS12-381 Fr or BN254 Fr scalar fields. Parameters are configurable (state size, S-box degree, round counts, MDS matrix, round constants).

---

## Instruction Budget Analysis

| Resource                     | Limit                               |
| ---------------------------- | ----------------------------------- |
| CPU instructions per tx      | 100 million                         |
| Groth16 verification (BLS12) | ~40 million                         |
| Groth16 verification (BN254) | Expected lower, not yet benchmarked |
| Read data per tx             | 200 KB                              |
| Write data per tx            | 65 KB                               |

The ~40M figure comes from Yan Michalevsky's SDF Privacy Pools prototype using BLS12-381. BN254 pairing is generally cheaper, so BN254-based Groth16 should fit comfortably. The remaining ~60M instructions covers surrounding contract logic (Merkle checks, state updates, nullifier storage).

---

## Existing Implementations to Study

### Nethermind — stellar-private-payments

Most directly relevant to Galeon's architecture.

- `circom2soroban` tool — converts Circom JSON outputs to Rust code for Soroban contracts
- 4 contracts: Pool, Circom Groth16 Verifier, ASP Membership (Merkle tree), ASP Non-Membership (sparse Merkle tree)
- 2-input / 2-output UTXO circuit compiled with Circom
- Browser-based proving via WebAssembly
- Limitations: no trusted setup ceremony, single circuit only, unaudited
- GitHub: github.com/NethermindEth/stellar-private-payments

### SDF Prototype — Privacy Pools

- Published on official Stellar blog
- Inspired by 0xbow framework
- Uses Groth16 + BLS12-381 (pre-Protocol 25)
- Implements Association Set Providers (ASPs) for compliance
- Includes mixer contract with Merkle tree, Circom circuits
- Early-stage: frontrunning prevention not yet implemented
- Blog: stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar

---

## Wording Corrections for Submission

- Don't say "Poseidon hashing host function" → say "Poseidon permutation primitives as host functions (CAP-0075)"
- The 40M benchmark is BLS12-381, not BN254. BN254 expected cheaper but unconfirmed.
- Fabio's bio is blank ("xx") in the interest form — needs filling for Build Award.

---

## Key References

- CAP-0074 (BN254): github.com/stellar/stellar-protocol/blob/master/core/cap-0074.md
- CAP-0075 (Poseidon): github.com/stellar/stellar-protocol/blob/master/core/cap-0075.md
- SDF Privacy Pools prototype: stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar
- Nethermind: github.com/NethermindEth/stellar-private-payments
- Protocol 25 announcement: stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25
