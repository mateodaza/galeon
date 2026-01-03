import { onchainTable, index } from 'ponder'

// ============================================================
// ANNOUNCEMENTS - ERC5564 Announcement events (raw blockchain data)
// ============================================================
// Indexed from ERC5564Announcer:Announcement events
export const announcements = onchainTable(
  'announcements',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Event data (from topics)
    schemeId: t.bigint().notNull(),
    stealthAddress: t.hex().notNull(),
    caller: t.hex().notNull(), // payer address

    // Event data (from log data)
    ephemeralPubKey: t.hex().notNull(), // 33 bytes compressed
    metadata: t.hex().notNull(), // viewTag (1) + receiptHash (32) + optional token data

    // Parsed metadata
    viewTag: t.integer().notNull(), // first byte of metadata (0-255)
    receiptHash: t.hex(), // bytes 1-33 of metadata

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    // Chain
    chainId: t.integer().notNull(),
  }),
  (table) => ({
    // Fast scan by viewTag (reduces checks by ~256x)
    viewTagIdx: index().on(table.viewTag),
    // Find by stealth address
    stealthAddressIdx: index().on(table.stealthAddress),
    // Find by caller/payer
    callerIdx: index().on(table.caller),
    // Time-based queries
    blockNumberIdx: index().on(table.blockNumber),
  })
)

// ============================================================
// PORTS - On-chain port registrations from GaleonRegistry
// ============================================================
// Indexed from GaleonRegistry:PortRegistered events
export const ports = onchainTable(
  'ports',
  (t) => ({
    // Primary key: portId (bytes32 from chain)
    id: t.hex().primaryKey(),

    // Event data
    owner: t.hex().notNull(),
    name: t.text().notNull(),
    stealthMetaAddress: t.hex().notNull(), // 66 bytes
    active: t.boolean().notNull(),

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    ownerIdx: index().on(table.owner),
    ownerActiveIdx: index().on(table.owner, table.active),
  })
)

// ============================================================
// RECEIPTS_ANCHORED - On-chain receipt anchoring from GaleonRegistry
// ============================================================
// Indexed from GaleonRegistry:ReceiptAnchored events
export const receiptsAnchored = onchainTable(
  'receipts_anchored',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Event data
    stealthAddress: t.hex().notNull(),
    receiptHash: t.hex().notNull(), // bytes32
    payer: t.hex().notNull(),
    amount: t.bigint().notNull(),
    token: t.hex().notNull(), // address(0) for native
    timestamp: t.bigint().notNull(),

    // Block context
    blockNumber: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    receiptHashIdx: index().on(table.receiptHash),
    stealthAddressIdx: index().on(table.stealthAddress),
    payerIdx: index().on(table.payer),
  })
)

// ============================================================
// ASP_ROOTS - Association Set Provider root updates
// ============================================================
// Indexed from GaleonEntrypoint:RootUpdated events
export const aspRoots = onchainTable(
  'asp_roots',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Event data
    root: t.hex().notNull(), // uint256 as hex
    ipfsCID: t.text().notNull(),
    timestamp: t.bigint().notNull(),

    // Root index (incrementing)
    rootIndex: t.integer().notNull(),

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    rootIdx: index().on(table.root),
    timestampIdx: index().on(table.timestamp),
    rootIndexIdx: index().on(table.rootIndex),
  })
)

// ============================================================
// POOLS - Registered Privacy Pools
// ============================================================
// Indexed from GaleonEntrypoint:PoolRegistered events
export const pools = onchainTable(
  'pools',
  (t) => ({
    // Primary key: pool address
    id: t.hex().primaryKey(),

    // Event data
    asset: t.hex().notNull(),
    scope: t.hex().notNull(), // uint256 as hex

    // Configuration (updated via PoolConfigurationUpdated)
    minimumDepositAmount: t.bigint().notNull(),
    vettingFeeBPS: t.integer().notNull(),
    maxRelayFeeBPS: t.integer().notNull(),

    // Status
    active: t.boolean().notNull(),
    dead: t.boolean().notNull(),

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    assetIdx: index().on(table.asset),
    scopeIdx: index().on(table.scope),
    activeIdx: index().on(table.active),
  })
)

// ============================================================
// POOL_DEPOSITS - Deposits into Privacy Pools
// ============================================================
// Indexed from GaleonPrivacyPool:Deposited events
export const poolDeposits = onchainTable(
  'pool_deposits',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Pool reference
    pool: t.hex().notNull(),

    // Event data
    depositor: t.hex().notNull(),
    commitment: t.hex().notNull(), // uint256 as hex
    label: t.hex().notNull(), // uint256 as hex
    value: t.bigint().notNull(),
    precommitmentHash: t.hex().notNull(), // uint256 as hex

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.pool),
    depositorIdx: index().on(table.depositor),
    commitmentIdx: index().on(table.commitment),
    labelIdx: index().on(table.label),
  })
)

// ============================================================
// POOL_WITHDRAWALS - Withdrawals from Privacy Pools
// ============================================================
// Indexed from GaleonPrivacyPool:Withdrawn events
export const poolWithdrawals = onchainTable(
  'pool_withdrawals',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Pool reference
    pool: t.hex().notNull(),

    // Event data from Withdrawn
    processooor: t.hex().notNull(), // address that processed
    value: t.bigint().notNull(),
    spentNullifier: t.hex().notNull(), // uint256 as hex
    newCommitment: t.hex().notNull(), // uint256 as hex

    // Additional data from WithdrawalRelayed (nullable - may not be relay)
    recipient: t.hex(), // from relay event
    relayer: t.hex(), // from relay event
    asset: t.hex(), // from relay event
    feeAmount: t.bigint(), // from relay event

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.pool),
    processooorIdx: index().on(table.processooor),
    recipientIdx: index().on(table.recipient),
    nullifierIdx: index().on(table.spentNullifier),
    newCommitmentIdx: index().on(table.newCommitment),
  })
)

// ============================================================
// POOL_RAGEQUITS - Ragequit exits from Privacy Pools
// ============================================================
// Indexed from GaleonPrivacyPool:Ragequit events
export const poolRagequits = onchainTable(
  'pool_ragequits',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Pool reference
    pool: t.hex().notNull(),

    // Event data
    ragequitter: t.hex().notNull(),
    commitment: t.hex().notNull(), // uint256 as hex
    label: t.hex().notNull(), // uint256 as hex
    value: t.bigint().notNull(),

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.pool),
    ragequitterIdx: index().on(table.ragequitter),
    commitmentIdx: index().on(table.commitment),
  })
)

// ============================================================
// MERKLE_LEAVES - State tree leaf insertions
// ============================================================
// Indexed from GaleonPrivacyPool:LeafInserted events
export const merkleLeaves = onchainTable(
  'merkle_leaves',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Pool reference
    pool: t.hex().notNull(),

    // Event data
    leafIndex: t.bigint().notNull(), // leaf index in tree
    leaf: t.hex().notNull(), // uint256 as hex
    root: t.hex().notNull(), // new root after insertion

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.pool),
    leafIdx: index().on(table.leaf),
    rootIdx: index().on(table.root),
    leafIndexIdx: index().on(table.leafIndex),
  })
)

// ============================================================
// VERIFIED_BALANCE_CONSUMPTIONS - Balance consumption tracking
// ============================================================
// Indexed from GaleonRegistry:VerifiedBalanceConsumed events
export const verifiedBalanceConsumptions = onchainTable(
  'verified_balance_consumptions',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Event data
    stealthAddress: t.hex().notNull(),
    asset: t.hex().notNull(),
    amount: t.bigint().notNull(),
    consumer: t.hex().notNull(), // pool that consumed

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    stealthAddressIdx: index().on(table.stealthAddress),
    assetIdx: index().on(table.asset),
    consumerIdx: index().on(table.consumer),
  })
)

// ============================================================
// BLOCKLIST_UPDATES - Depositor blocklist changes
// ============================================================
// Indexed from GaleonPrivacyPool:DepositorBlocklistUpdated events
export const blocklistUpdates = onchainTable(
  'blocklist_updates',
  (t) => ({
    // Primary key: txHash-logIndex
    id: t.text().primaryKey(),

    // Pool reference
    pool: t.hex().notNull(),

    // Event data
    depositor: t.hex().notNull(),
    blocked: t.boolean().notNull(),

    // Block context
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),
    logIndex: t.integer().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    poolIdx: index().on(table.pool),
    depositorIdx: index().on(table.depositor),
  })
)

// ============================================================
// FROZEN_ADDRESSES - Frozen stealth address tracking
// ============================================================
// Indexed from GaleonRegistry:StealthAddressFrozen events
export const frozenAddresses = onchainTable(
  'frozen_addresses',
  (t) => ({
    // Primary key: stealth address
    id: t.hex().primaryKey(),

    // Status
    frozen: t.boolean().notNull(),

    // Block context (last update)
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    frozenIdx: index().on(table.frozen),
  })
)

// ============================================================
// AUTHORIZED_POOLS - Pool authorization tracking
// ============================================================
// Indexed from GaleonRegistry:PrivacyPoolAuthorized events
export const authorizedPools = onchainTable(
  'authorized_pools',
  (t) => ({
    // Primary key: pool address
    id: t.hex().primaryKey(),

    // Status
    authorized: t.boolean().notNull(),

    // Block context (last update)
    blockNumber: t.bigint().notNull(),
    blockTimestamp: t.bigint().notNull(),
    transactionHash: t.hex().notNull(),

    chainId: t.integer().notNull(),
  }),
  (table) => ({
    authorizedIdx: index().on(table.authorized),
  })
)
