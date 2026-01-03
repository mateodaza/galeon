# Galeon Privacy Pool - Audit Summary

> Technical summary for security auditors

## Overview

Galeon Privacy Pool is a **fork of 0xbow privacy-pools-core** adapted for Mantle L2 with Galeon-specific modifications for compliant private payments.

**Source Repository:** https://github.com/0xbow-io/privacy-pools-core
**License:** Apache-2.0
**0xbow Audit Status:** Audited (see `/packages/0xbow/audit/`)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GALEON PRIVACY POOL SYSTEM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐  │
│  │ GaleonEntrypoint│────▶│ GaleonPrivacy   │────▶│   Verifiers   │  │
│  │   (UUPS)        │     │   Pool (UUPS)   │     │  (Groth16)    │  │
│  └────────┬────────┘     └────────┬────────┘     └───────────────┘  │
│           │                       │                                  │
│           │                       ▼                                  │
│           │              ┌─────────────────┐                        │
│           │              │  GaleonState    │                        │
│           │              │  (LeanIMT +     │                        │
│           │              │   Poseidon)     │                        │
│           │              └─────────────────┘                        │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │ GaleonRegistry  │     │   GaleonASP     │                        │
│  │ (Port tracking) │     │ (Blocklist/     │                        │
│  │                 │     │  Compliance)    │                        │
│  └─────────────────┘     └─────────────────┘                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Contract Mapping: 0xbow → Galeon

| 0xbow Contract           | Galeon Contract                | Modifications                                       |
| ------------------------ | ------------------------------ | --------------------------------------------------- |
| `Entrypoint.sol`         | `GaleonEntrypoint.sol`         | + GaleonRegistry integration                        |
| `State.sol`              | `GaleonState.sol`              | Minimal changes                                     |
| `PrivacyPool.sol`        | `GaleonPrivacyPool.sol`        | + Port-only deposits, + Stealth withdrawals, + UUPS |
| `PrivacyPoolSimple.sol`  | `GaleonPrivacyPoolSimple.sol`  | Native MNT implementation                           |
| `PrivacyPoolComplex.sol` | `GaleonPrivacyPoolComplex.sol` | ERC20 implementation                                |
| `ProofLib.sol`           | `ProofLib.sol`                 | No changes                                          |
| `Constants.sol`          | `Constants.sol`                | No changes                                          |
| `WithdrawalVerifier.sol` | `WithdrawalVerifier.sol`       | Generated from 0xbow circuits                       |
| `CommitmentVerifier.sol` | `RagequitVerifier.sol`         | Generated from 0xbow circuits                       |

---

## Galeon-Specific Modifications

### 1. Port-Only Deposits (NEW)

**File:** `GaleonPrivacyPool.sol`
**Purpose:** Only allow deposits from verified Port stealth addresses

```solidity
// GALEON MODIFICATION: Port-only deposits
function deposit(...) external payable onlyEntrypoint returns (uint256 _commitment) {
    // ... 0xbow logic ...

    // GALEON ADDITION: Verify depositor is a Port stealth address
    require(
        galeonRegistry.isPortStealthAddress(msg.sender),
        "Must deposit from Port"
    );

    // ... rest of 0xbow logic ...
}
```

**Security Consideration:** This restricts the anonymity set to only verified Port users, which is intentional for compliance.

---

### 2. Stealth Withdrawal Addresses (NEW)

**File:** `GaleonPrivacyPool.sol`
**Purpose:** Track valid stealth addresses for withdrawals

```solidity
// GALEON ADDITION: Stealth address registration
mapping(address => bool) public isValidWithdrawalAddress;

function registerWithdrawalAddress(
    address stealthAddress,
    bytes calldata ephemeralPubKey,
    bytes1 viewTag
) external {
    require(ephemeralPubKey.length == 33, "Invalid key length");
    require(ephemeralPubKey[0] == 0x02 || ephemeralPubKey[0] == 0x03, "Invalid prefix");

    isValidWithdrawalAddress[stealthAddress] = true;
    emit WithdrawalAddressRegistered(stealthAddress, ephemeralPubKey, viewTag);
}
```

**Security Consideration:** Anyone can register a stealth address. This is by design - the ZK proof ensures only the secret holder can withdraw.

---

### 3. UUPS Upgradeability for Pools (NEW)

**File:** `GaleonPrivacyPool.sol`
**Purpose:** Allow verifier swapping for circuit upgrades

```solidity
// GALEON ADDITION: UUPS pattern for upgradeability
contract GaleonPrivacyPool is
    State,
    IPrivacyPool,
    Initializable,           // NEW
    UUPSUpgradeable,         // NEW
    OwnableUpgradeable       // NEW
{
    // Swappable verifiers (not immutable like 0xbow)
    IVerifier public withdrawalVerifier;  // Changed from immutable
    IVerifier public ragequitVerifier;    // Changed from immutable

    function upgradeVerifier(
        address _newWithdrawalVerifier,
        address _newRagequitVerifier
    ) external onlyOwner {
        withdrawalVerifier = IVerifier(_newWithdrawalVerifier);
        ragequitVerifier = IVerifier(_newRagequitVerifier);
        emit VerifiersUpgraded(_newWithdrawalVerifier, _newRagequitVerifier);
    }
}
```

**Security Consideration:** Only owner can upgrade. Old deposits remain withdrawable with new verifiers (circuit compatibility required).

---

### 4. GaleonRegistry Integration (NEW)

**File:** `GaleonEntrypoint.sol`
**Purpose:** Connect Privacy Pool to Galeon's Port system

```solidity
// GALEON ADDITION: Registry for Port verification
IGaleonRegistry public galeonRegistry;

function setGaleonRegistry(address _registry) external onlyRole(_OWNER_ROLE) {
    galeonRegistry = IGaleonRegistry(_registry);
}
```

---

## Cryptographic Components

### ZK Circuits (from 0xbow)

| Circuit      | Purpose                                 | Public Signals |
| ------------ | --------------------------------------- | -------------- |
| `Withdrawal` | Prove deposit membership + ASP approval | 8 signals      |
| `Ragequit`   | Original depositor exit (no ASP needed) | 4 signals      |

### Hash Functions

| Function  | Usage                        | Library             |
| --------- | ---------------------------- | ------------------- |
| Poseidon  | Commitment hash, Merkle tree | `poseidon-solidity` |
| Keccak256 | Scope, label generation      | Native              |

### Merkle Tree

- **Type:** LeanIMT (Lean Incremental Merkle Tree)
- **Library:** `@zk-kit/lean-imt.sol`
- **Max Depth:** 32 levels
- **Root History:** 64 roots (circular buffer)

---

## BN254 Precompile Verification

**Status:** VERIFIED on Mantle Mainnet

```
Chain: Mantle Mainnet (5000)
Verifier: 0xc3271Adde07c2481563d1dFeF84a10134C756683
Checker: 0x7067dD9de73184913dF1b759f9307B6AbCFBDECE

Results:
  ecAdd (0x06):   ✓ PASS
  ecMul (0x07):   ✓ PASS
  pairing (0x08): ✓ PASS
```

Groth16 proofs will verify correctly on Mantle.

---

## Deployed Contracts (Mantle Mainnet)

| Contract                 | Address                                      | Verified |
| ------------------------ | -------------------------------------------- | -------- |
| PrecompileChecker        | `0xc3271Adde07c2481563d1dFeF84a10134C756683` | Pending  |
| GaleonPrivacyPool (impl) | `0xf97993096214C1DD8D015ca3B6Ca239CF43CfFEe` | Pending  |
| GaleonERC20Pool (impl)   | `0x05e5799C7De8d305edd1d2f6879952228461035b` | Pending  |
| GaleonPoolFactory        | `0x2f9F67CD7b5Ba1DcbcAB240909293fe3581BBd9C` | Pending  |
| Native MNT Pool (proxy)  | `0xd4A156ad39386838a7E364437de50982d97ab8B4` | Pending  |

**Note:** These use simplified contracts. Will be replaced with full 0xbow adaptation.

---

## Security Considerations

### Inherited from 0xbow

1. **Nullifier tracking** - Prevents double-spend
2. **Root history** - Allows proofs against recent roots
3. **Ragequit** - Original depositor can exit without ASP approval
4. **ASP verification** - Proof must include valid ASP root

### Galeon-Specific

1. **Port restriction** - Limits anonymity set to verified Ports (intentional)
2. **Stealth address registry** - Open registration (ZK proof provides security)
3. **Verifier upgradeability** - Owner can swap verifiers (for circuit upgrades)
4. **UUPS proxies** - Standard OpenZeppelin pattern

### Known Limitations

1. **Anonymity set** - Limited to Port users only
2. **ASP centralization** - Galeon controls the ASP (intentional for compliance)
3. **Upgrade risk** - Owner can upgrade contracts (standard for early-stage protocols)

---

## Files Changed from 0xbow

```
packages/contracts/contracts/privacy-pool/
├── lib/
│   ├── Constants.sol          # No changes
│   └── ProofLib.sol           # No changes
├── interfaces/
│   ├── IVerifier.sol          # No changes
│   ├── IGaleonRegistry.sol    # NEW - Galeon-specific
│   └── IGaleonEntrypoint.sol  # Adapted from IEntrypoint
├── GaleonState.sol            # Adapted from State.sol
├── GaleonPrivacyPool.sol      # Adapted from PrivacyPool.sol + UUPS + Galeon mods
├── GaleonPrivacyPoolSimple.sol # Adapted from PrivacyPoolSimple.sol
├── GaleonEntrypoint.sol       # Adapted from Entrypoint.sol + GaleonRegistry
└── verifiers/
    ├── WithdrawalVerifier.sol # From 0xbow circuit compilation
    └── RagequitVerifier.sol   # From 0xbow circuit compilation
```

---

## Audit Scope Recommendation

### High Priority (Galeon modifications)

1. `GaleonPrivacyPool.sol` - Port-only deposits, stealth registration, UUPS
2. `GaleonEntrypoint.sol` - GaleonRegistry integration
3. Upgrade mechanism - Verifier swapping logic

### Medium Priority (Adapted from 0xbow)

1. `GaleonState.sol` - Verify no regressions from 0xbow
2. Import path changes - Ensure no breaking changes

### Low Priority (Unchanged from 0xbow)

1. `ProofLib.sol` - Direct copy
2. `Constants.sol` - Direct copy
3. Verifier contracts - Generated from audited circuits

---

## References

- [0xbow Privacy Pools Core](https://github.com/0xbow-io/privacy-pools-core)
- [Privacy Pools Paper (Vitalik et al.)](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364)
- [0xbow Documentation](https://docs.privacypools.com)
- [Galeon Plan](../galeon-hackathon-plan.md)
