# Dune Dashboard Plan for Galeon (Mantle Mainnet)

## Context

Galeon needs an on-chain traction dashboard for the Nitro Accelerator application (deadline March 14, 2026). The dashboard will query Mantle mainnet contracts using raw event logs on Dune Analytics. Numbers may be low — the dashboard existing and being honest is what matters.

## Contract Addresses (Mantle, chain ID 5000)

| Contract         | Address                                      |
| ---------------- | -------------------------------------------- |
| GaleonRegistry   | `0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D` |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` |
| GaleonEntrypoint | `0x8633518fbbf23E78586F1456530c3452885efb21` |
| GaleonPool       | `0xE271335D1FCa02b6c219B9944f0a4921aFD559C0` |

## Event Topic0 Hashes

| Event             | Contract     | Hash                                                                 |
| ----------------- | ------------ | -------------------------------------------------------------------- |
| Deposited         | Pool         | `0xe3b53cd1a44fbf11535e145d80b8ef1ed6d57a73bf5daa7e939b6b01657d6549` |
| Withdrawn         | Pool         | `0x75e161b3e824b114fc1a33274bd7091918dd4e639cede50b78b15a4eea956a21` |
| Ragequit          | Pool         | `0xd2b3e868ae101106371f2bd93abc8d5a4de488b9fe47ed122c23625aa7172f13` |
| PortRegistered    | Registry     | `0xad04dd8576e2c40d1c6620739d8a19d49b08b861ae395e4066086f6255670aa3` |
| LeafInserted      | Pool (State) | `0xcb249c8292372bd11f567786635483fca9e635030baafca55ff1a8940141d221` |
| RootUpdated       | Entrypoint   | `0xf43641373d5bc20fddfffcd0496fd39bde41e1aa0ce326d8899b7e658261ac02` |
| MergeDeposited    | Pool         | `0xad65bc9b39357f123f0593bfee904c95b8a246b101e8c5bd2f1e96bc4affa896` |
| WithdrawalRelayed | Entrypoint   | `0xe9b67844a7bb6e6ac95e8a0de02e4448dbb0c9460be9194348e4bbac6d13c2cf` |
| ReceiptAnchored   | Registry     | `0x9e008b24587bcf6b30c4067be7a26fb85bf573f035c4058ec4a27c00409496e6` |

## Audit Fixes Applied

| #   | Severity | Issue                                                                       | Fix                                                                  |
| --- | -------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | Critical | MergeDeposited excluded from TVL/volume                                     | All deposit metrics now UNION Deposited + MergeDeposited events      |
| 2   | High     | LeafInserted overstates "anonymity set" (fires on deposit, withdraw, merge) | Renamed to "Cumulative Merkle Tree Leaves" with explanatory subtitle |
| 3   | Medium   | PortRegistered ≠ stealth addresses                                          | Renamed to "Unique Ports Created" (port = named payment endpoint)    |
| 4   | Medium   | Announcement events are public, pollutable by spam                          | Switched to ReceiptAnchored from GaleonRegistry for payment metrics  |
| 5   | —        | Announcement event removed from topic0 table                                | No longer needed                                                     |

## Deliverable

A single markdown file `DUNE-DASHBOARD.md` in the repo root containing:

1. All SQL queries (copy-paste ready for Dune)
2. Dashboard layout instructions
3. Notes on updating for Base migration

## Dashboard Layout (12 queries total)

### Row 1: Key Counters (6 panels)

1. **Total Deposits** — count of `Deposited` + `MergeDeposited` events on Pool
2. **Total Deposit Volume (MNT)** — sum of `_value` from Deposited + `_depositValue` from MergeDeposited, divided by 1e18
3. **Total Withdrawals** — count of `Withdrawn` events on Pool
4. **Total Withdrawal Volume (MNT)** — sum of `_value` from Pool Withdrawn (data bytes 1-32, divided by 1e18)
5. **Unique Ports Created** — count of `PortRegistered` events on Registry
6. **Current Pool TVL (MNT)** — cumulative (deposits + merge deposits) - withdrawals - ragequits

### Row 2: Users

7. **Unique Depositors** — `COUNT(DISTINCT topic1)` from Pool Deposited + MergeDeposited events combined
8. **Unique Stealth Payment Recipients** — `COUNT(DISTINCT topic1)` from ReceiptAnchored events on GaleonRegistry (topic1 = stealthAddress, indexed)

### Row 3: Time Series Charts

9. **Pool TVL Over Time** (line chart) — running sum of (deposits + merge deposits) minus (withdrawals + ragequits) by day
10. **Daily Activity** (bar chart) — daily counts of deposits (incl. merge), withdrawals, stealth payments (ReceiptAnchored)
11. **Cumulative Merkle Tree Leaves** (area chart) — running count of `LeafInserted` events over time. Subtitle: "Includes deposit, withdrawal, and merge commitments"
12. **ASP Root Updates Over Time** (step chart) — cumulative `RootUpdated` events, showing compliance cadence

## Query Approach

All queries use `mantle.logs` raw table since contracts aren't decoded on Dune. Pattern:

```sql
SELECT ...
FROM mantle.logs
WHERE contract_address = 0x...
  AND topic0 = 0x...
```

Data decoding uses `bytearray_to_uint256(bytearray_substring(data, offset, 32))` for extracting uint256 values from non-indexed event parameters. Offsets are 1-indexed in DuneSQL.

### Data field offsets per event:

**Pool Deposited** `(address indexed _depositor, uint256 _commitment, uint256 _label, uint256 _value, uint256 _precommitmentHash)`:

- `_value` at data bytes 65-96 (3rd slot)

**Pool MergeDeposited** `(address indexed _depositor, uint256 _depositValue, uint256 _existingNullifierHash, uint256 _newCommitmentHash)`:

- `_depositValue` at data bytes 1-32 (1st slot)

**Pool Withdrawn** `(address indexed _processooor, uint256 _value, uint256 _spentNullifier, uint256 _newCommitment)`:

- `_value` at data bytes 1-32 (1st slot)

**Pool Ragequit** `(address indexed _ragequitter, uint256 _commitment, uint256 _label, uint256 _value)`:

- `_value` at data bytes 65-96 (3rd slot)

**Registry ReceiptAnchored** `(address indexed stealthAddress, bytes32 indexed receiptHash, address indexed payer, uint256 amount, address token, uint256 timestamp)`:

- All 3 indexed params in topic1/topic2/topic3
- `amount` at data bytes 1-32, `token` at bytes 33-64, `timestamp` at bytes 65-96

### Combined deposit query pattern (for TVL, volume, counts):

```sql
SELECT block_time, 'deposit' as type,
  CAST(bytearray_to_uint256(bytearray_substring(data, 65, 32)) AS DECIMAL(38,0)) / CAST(1e18 AS DECIMAL(38,0)) as value_mnt
FROM mantle.logs
WHERE contract_address = 0xE271335D1FCa02b6c219B9944f0a4921aFD559C0
  AND topic0 = 0xe3b53cd1a44fbf11535e145d80b8ef1ed6d57a73bf5daa7e939b6b01657d6549

UNION ALL

SELECT block_time, 'merge_deposit' as type,
  CAST(bytearray_to_uint256(bytearray_substring(data, 1, 32)) AS DECIMAL(38,0)) / CAST(1e18 AS DECIMAL(38,0)) as value_mnt
FROM mantle.logs
WHERE contract_address = 0xE271335D1FCa02b6c219B9944f0a4921aFD559C0
  AND topic0 = 0xad65bc9b39357f123f0593bfee904c95b8a246b101e8c5bd2f1e96bc4affa896
```

### MNT price (optional USD conversion):

```sql
LEFT JOIN prices.usd p ON p.blockchain = 'mantle'
  AND p.contract_address = 0x0000000000000000000000000000000000000000
  AND p.minute = date_trunc('minute', l.block_time)
```

## Steps to Execute

1. **Write `DUNE-DASHBOARD.md`** with all 12 SQL queries, tested syntax, and setup instructions
2. **Create queries on Dune** — go to dune.com, create each query, verify they return data
3. **Build dashboard** — arrange panels per the layout above, add titles and descriptions
4. **Share link** — public dashboard URL for the Nitro application

## Base Migration Note

If migrating to Base before March 14:

- Duplicate each query replacing `mantle.logs` → `base.logs` and updating contract addresses
- Or use `UNION ALL` to show both chains in a single dashboard
- Contract addresses on Base TBD (not deployed yet)

## Verification

- Each query should be runnable on dune.com against Mantle data
- Cross-check deposit/withdrawal counts against Mantlescan transaction history for the pool contract
- TVL should match the pool contract's native MNT balance on Mantlescan (native-only; update scope if ERC20 pools are added later)
- ReceiptAnchored count should match stealth payments visible in GaleonRegistry on Mantlescan
