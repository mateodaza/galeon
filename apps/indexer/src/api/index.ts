import { db } from 'ponder:api'
import * as schema from 'ponder:schema'
import { Hono } from 'hono'
import { eq, desc, and } from 'ponder'

const app = new Hono()

// Helper to serialize BigInts to strings for JSON
function serializeBigInts<T>(obj: T): T {
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
  )
}

// GET /announcements - List all announcements with optional filters
app.get('/announcements', async (c) => {
  const viewTag = c.req.query('viewTag')
  const stealthAddress = c.req.query('stealthAddress')
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.announcements)

  if (viewTag) {
    query = query.where(eq(schema.announcements.viewTag, parseInt(viewTag)))
  }
  if (stealthAddress) {
    query = query.where(
      eq(schema.announcements.stealthAddress, stealthAddress.toLowerCase() as `0x${string}`)
    )
  }

  const results = await query.orderBy(desc(schema.announcements.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /announcements/by-view-tag/:viewTag - Filter by view tag
app.get('/announcements/by-view-tag/:viewTag', async (c) => {
  const viewTag = parseInt(c.req.param('viewTag'))
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.announcements)
    .where(eq(schema.announcements.viewTag, viewTag))
    .orderBy(desc(schema.announcements.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /ports - List all ports with optional owner filter
app.get('/ports', async (c) => {
  const owner = c.req.query('owner')
  const activeOnly = c.req.query('active') === 'true'
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.ports)

  if (owner) {
    if (activeOnly) {
      query = query.where(
        and(
          eq(schema.ports.owner, owner.toLowerCase() as `0x${string}`),
          eq(schema.ports.active, true)
        )
      )
    } else {
      query = query.where(eq(schema.ports.owner, owner.toLowerCase() as `0x${string}`))
    }
  } else if (activeOnly) {
    query = query.where(eq(schema.ports.active, true))
  }

  const results = await query.orderBy(desc(schema.ports.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /ports/:id - Get a single port by ID
app.get('/ports/:id', async (c) => {
  const id = c.req.param('id')

  const result = await db
    .select()
    .from(schema.ports)
    .where(eq(schema.ports.id, id as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Port not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// GET /receipts - List all anchored receipts
app.get('/receipts', async (c) => {
  const stealthAddress = c.req.query('stealthAddress')
  const payer = c.req.query('payer')
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.receiptsAnchored)

  if (stealthAddress) {
    query = query.where(
      eq(schema.receiptsAnchored.stealthAddress, stealthAddress.toLowerCase() as `0x${string}`)
    )
  }
  if (payer) {
    query = query.where(eq(schema.receiptsAnchored.payer, payer.toLowerCase() as `0x${string}`))
  }

  const results = await query.orderBy(desc(schema.receiptsAnchored.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /receipts/:receiptHash - Get receipt by hash
app.get('/receipts/:receiptHash', async (c) => {
  const receiptHash = c.req.param('receiptHash')

  const result = await db
    .select()
    .from(schema.receiptsAnchored)
    .where(eq(schema.receiptsAnchored.receiptHash, receiptHash as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Receipt not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// ============================================================
// ASP Roots
// ============================================================

// GET /asp-roots - List ASP roots with pagination
app.get('/asp-roots', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.aspRoots)
    .orderBy(desc(schema.aspRoots.rootIndex))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /asp-roots/latest - Get the latest ASP root
app.get('/asp-roots/latest', async (c) => {
  const result = await db
    .select()
    .from(schema.aspRoots)
    .orderBy(desc(schema.aspRoots.rootIndex))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'No ASP roots found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// GET /asp-roots/:index - Get ASP root by index
app.get('/asp-roots/:index', async (c) => {
  const index = parseInt(c.req.param('index'))

  const result = await db
    .select()
    .from(schema.aspRoots)
    .where(eq(schema.aspRoots.rootIndex, index))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'ASP root not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// ============================================================
// Pools
// ============================================================

// GET /pools - List registered pools
app.get('/pools', async (c) => {
  const activeOnly = c.req.query('active') === 'true'
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.pools)

  if (activeOnly) {
    query = query.where(eq(schema.pools.active, true))
  }

  const results = await query.orderBy(desc(schema.pools.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /pools/:address - Get pool by address
app.get('/pools/:address', async (c) => {
  const address = c.req.param('address')

  const result = await db
    .select()
    .from(schema.pools)
    .where(eq(schema.pools.id, address.toLowerCase() as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Pool not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// GET /pools/:address/deposits - Get deposits for a pool (ordered by insertion order for Merkle tree consistency)
app.get('/pools/:address/deposits', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolDeposits)
    .where(eq(schema.poolDeposits.pool, address.toLowerCase() as `0x${string}`))
    .orderBy(schema.poolDeposits.blockNumber)
    .orderBy(schema.poolDeposits.logIndex)
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /pools/:address/withdrawals - Get withdrawals for a pool
app.get('/pools/:address/withdrawals', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolWithdrawals)
    .where(eq(schema.poolWithdrawals.pool, address.toLowerCase() as `0x${string}`))
    .orderBy(desc(schema.poolWithdrawals.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /pools/:address/ragequits - Get ragequits for a pool
app.get('/pools/:address/ragequits', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolRagequits)
    .where(eq(schema.poolRagequits.pool, address.toLowerCase() as `0x${string}`))
    .orderBy(desc(schema.poolRagequits.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /pools/:address/merge-deposits - Get merge deposits for a pool
app.get('/pools/:address/merge-deposits', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolMergeDeposits)
    .where(eq(schema.poolMergeDeposits.pool, address.toLowerCase() as `0x${string}`))
    .orderBy(schema.poolMergeDeposits.blockNumber)
    .orderBy(schema.poolMergeDeposits.logIndex)
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /pools/:address/leaves - Get merkle leaves for a pool (ordered by leafIndex for Merkle tree consistency)
app.get('/pools/:address/leaves', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.merkleLeaves)
    .where(eq(schema.merkleLeaves.pool, address.toLowerCase() as `0x${string}`))
    .orderBy(schema.merkleLeaves.leafIndex)
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// ============================================================
// Deposits (cross-pool)
// ============================================================

// GET /deposits - List all deposits (ordered by insertion order for Merkle tree consistency)
app.get('/deposits', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolDeposits)
    .orderBy(schema.poolDeposits.blockNumber)
    .orderBy(schema.poolDeposits.logIndex)
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /deposits/by-depositor/:address - Get deposits by depositor
app.get('/deposits/by-depositor/:address', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolDeposits)
    .where(eq(schema.poolDeposits.depositor, address.toLowerCase() as `0x${string}`))
    .orderBy(desc(schema.poolDeposits.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /deposits/by-commitment/:hex - Find deposit by commitment
app.get('/deposits/by-commitment/:hex', async (c) => {
  const commitment = c.req.param('hex')

  const result = await db
    .select()
    .from(schema.poolDeposits)
    .where(eq(schema.poolDeposits.commitment, commitment.toLowerCase() as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Deposit not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// ============================================================
// Merge Deposits (cross-pool)
// ============================================================

// GET /merge-deposits - List all merge deposits
app.get('/merge-deposits', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolMergeDeposits)
    .orderBy(desc(schema.poolMergeDeposits.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /merge-deposits/by-nullifier/:hex - Find merge deposit by spent nullifier hash
app.get('/merge-deposits/by-nullifier/:hex', async (c) => {
  const nullifier = c.req.param('hex')

  const result = await db
    .select()
    .from(schema.poolMergeDeposits)
    .where(
      eq(schema.poolMergeDeposits.existingNullifierHash, nullifier.toLowerCase() as `0x${string}`)
    )
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Merge deposit not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// ============================================================
// Withdrawals (cross-pool)
// ============================================================

// GET /withdrawals - List all withdrawals
app.get('/withdrawals', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolWithdrawals)
    .orderBy(desc(schema.poolWithdrawals.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /withdrawals/by-recipient/:address - Get withdrawals by recipient
app.get('/withdrawals/by-recipient/:address', async (c) => {
  const address = c.req.param('address')
  const limit = parseInt(c.req.query('limit') || '100')

  const results = await db
    .select()
    .from(schema.poolWithdrawals)
    .where(eq(schema.poolWithdrawals.recipient, address.toLowerCase() as `0x${string}`))
    .orderBy(desc(schema.poolWithdrawals.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /withdrawals/by-nullifier/:hex - Find withdrawal by spent nullifier hash
app.get('/withdrawals/by-nullifier/:hex', async (c) => {
  const nullifier = c.req.param('hex')

  const result = await db
    .select()
    .from(schema.poolWithdrawals)
    .where(eq(schema.poolWithdrawals.spentNullifier, nullifier.toLowerCase() as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ error: 'Withdrawal not found' }, 404)
  }

  return c.json(serializeBigInts(result[0]))
})

// ============================================================
// Nullifiers
// ============================================================

// GET /nullifiers/:hex - Check if nullifier has been spent (via withdrawal OR merge)
app.get('/nullifiers/:hex', async (c) => {
  const nullifier = c.req.param('hex').toLowerCase() as `0x${string}`

  // Check withdrawals first
  const withdrawal = await db
    .select()
    .from(schema.poolWithdrawals)
    .where(eq(schema.poolWithdrawals.spentNullifier, nullifier))
    .limit(1)

  if (withdrawal.length > 0) {
    return c.json({
      spent: true,
      spentBy: 'withdrawal',
      withdrawal: serializeBigInts(withdrawal[0]),
      mergeDeposit: null,
    })
  }

  // Check merge deposits
  const mergeDeposit = await db
    .select()
    .from(schema.poolMergeDeposits)
    .where(eq(schema.poolMergeDeposits.existingNullifierHash, nullifier))
    .limit(1)

  if (mergeDeposit.length > 0) {
    return c.json({
      spent: true,
      spentBy: 'merge',
      withdrawal: null,
      mergeDeposit: serializeBigInts(mergeDeposit[0]),
    })
  }

  return c.json({
    spent: false,
    spentBy: null,
    withdrawal: null,
    mergeDeposit: null,
  })
})

// ============================================================
// Compliance
// ============================================================

// GET /blocklist - List blocklist updates
app.get('/blocklist', async (c) => {
  const pool = c.req.query('pool')
  const depositor = c.req.query('depositor')
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.blocklistUpdates)

  if (pool) {
    query = query.where(eq(schema.blocklistUpdates.pool, pool.toLowerCase() as `0x${string}`))
  }
  if (depositor) {
    query = query.where(
      eq(schema.blocklistUpdates.depositor, depositor.toLowerCase() as `0x${string}`)
    )
  }

  const results = await query.orderBy(desc(schema.blocklistUpdates.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /frozen - List frozen addresses
app.get('/frozen', async (c) => {
  const frozenOnly = c.req.query('frozenOnly') !== 'false'
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.frozenAddresses)

  if (frozenOnly) {
    query = query.where(eq(schema.frozenAddresses.frozen, true))
  }

  const results = await query.orderBy(desc(schema.frozenAddresses.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /frozen/:address - Check if address is frozen
app.get('/frozen/:address', async (c) => {
  const address = c.req.param('address')

  const result = await db
    .select()
    .from(schema.frozenAddresses)
    .where(eq(schema.frozenAddresses.id, address.toLowerCase() as `0x${string}`))
    .limit(1)

  if (result.length === 0) {
    return c.json({ frozen: false })
  }

  return c.json({ frozen: result[0].frozen, record: serializeBigInts(result[0]) })
})

// GET /verified-balance-consumptions - List balance consumptions
app.get('/verified-balance-consumptions', async (c) => {
  const stealthAddress = c.req.query('stealthAddress')
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.verifiedBalanceConsumptions)

  if (stealthAddress) {
    query = query.where(
      eq(
        schema.verifiedBalanceConsumptions.stealthAddress,
        stealthAddress.toLowerCase() as `0x${string}`
      )
    )
  }

  const results = await query
    .orderBy(desc(schema.verifiedBalanceConsumptions.blockNumber))
    .limit(limit)

  return c.json(serializeBigInts(results))
})

// GET /authorized-pools - List authorized pools
app.get('/authorized-pools', async (c) => {
  const authorizedOnly = c.req.query('authorizedOnly') !== 'false'
  const limit = parseInt(c.req.query('limit') || '100')

  let query = db.select().from(schema.authorizedPools)

  if (authorizedOnly) {
    query = query.where(eq(schema.authorizedPools.authorized, true))
  }

  const results = await query.orderBy(desc(schema.authorizedPools.blockNumber)).limit(limit)

  return c.json(serializeBigInts(results))
})

// ============================================================
// Sync Status (renamed from /health to avoid Ponder conflict)
// ============================================================

// GET /sync-status - Indexer sync status
app.get('/sync-status', async (c) => {
  try {
    // Get latest indexed block from merkle_leaves (most frequently updated table)
    const latestLeaf = await db
      .select()
      .from(schema.merkleLeaves)
      .orderBy(desc(schema.merkleLeaves.blockNumber))
      .limit(1)

    // Fallback to pool_deposits if no leaves
    let lastIndexedBlock = latestLeaf[0]?.blockNumber ?? null

    if (!lastIndexedBlock) {
      const latestDeposit = await db
        .select()
        .from(schema.poolDeposits)
        .orderBy(desc(schema.poolDeposits.blockNumber))
        .limit(1)

      lastIndexedBlock = latestDeposit[0]?.blockNumber ?? null
    }

    // Get counts for context
    const [depositCount, leafCount, withdrawalCount] = await Promise.all([
      db.select().from(schema.poolDeposits),
      db.select().from(schema.merkleLeaves),
      db.select().from(schema.poolWithdrawals),
    ])

    return c.json({
      status: 'ok',
      lastIndexedBlock: lastIndexedBlock ? Number(lastIndexedBlock) : 0,
      counts: {
        deposits: depositCount.length,
        merkleLeaves: leafCount.length,
        withdrawals: withdrawalCount.length,
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    return c.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      500
    )
  }
})

export default app
