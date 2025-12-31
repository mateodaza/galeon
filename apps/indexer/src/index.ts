import { ponder } from 'ponder:registry'
import * as schema from 'ponder:schema'

// ============================================================
// ERC5564 Announcer Events
// ============================================================
ponder.on('ERC5564Announcer:Announcement', async ({ event, context }) => {
  const { schemeId, stealthAddress, caller, ephemeralPubKey, metadata } = event.args

  // Parse metadata: first byte is viewTag, next 32 bytes (if present) is receiptHash
  const metadataHex = metadata.slice(2) // Remove 0x prefix
  const viewTag = metadataHex.length >= 2 ? parseInt(metadataHex.slice(0, 2), 16) : 0
  const receiptHash =
    metadataHex.length >= 66 ? (`0x${metadataHex.slice(2, 66)}` as `0x${string}`) : undefined

  await context.db.insert(schema.announcements).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    schemeId,
    stealthAddress: stealthAddress.toLowerCase() as `0x${string}`,
    caller: caller.toLowerCase() as `0x${string}`,
    ephemeralPubKey: ephemeralPubKey as `0x${string}`,
    metadata: metadata as `0x${string}`,
    viewTag,
    receiptHash,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

// ============================================================
// GaleonRegistry Events
// ============================================================
ponder.on('GaleonRegistry:PortRegistered', async ({ event, context }) => {
  const { owner, portId, name, stealthMetaAddress } = event.args

  await context.db.insert(schema.ports).values({
    id: portId,
    owner: owner.toLowerCase() as `0x${string}`,
    name,
    stealthMetaAddress: stealthMetaAddress as `0x${string}`,
    active: true,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonRegistry:PortDeactivated', async ({ event, context }) => {
  const { portId } = event.args

  await context.db.update(schema.ports, { id: portId }).set({
    active: false,
  })
})

ponder.on('GaleonRegistry:ReceiptAnchored', async ({ event, context }) => {
  const { stealthAddress, receiptHash, payer, amount, token, timestamp } = event.args

  await context.db.insert(schema.receiptsAnchored).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    stealthAddress: stealthAddress.toLowerCase() as `0x${string}`,
    receiptHash,
    payer: payer.toLowerCase() as `0x${string}`,
    amount,
    token: token.toLowerCase() as `0x${string}`,
    timestamp,
    blockNumber: event.block.number,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})
