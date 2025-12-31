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
