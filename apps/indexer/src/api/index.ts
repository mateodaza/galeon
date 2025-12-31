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

export default app
