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

ponder.on('GaleonRegistry:VerifiedBalanceConsumed', async ({ event, context }) => {
  const { stealthAddress, asset, amount, consumer } = event.args

  await context.db.insert(schema.verifiedBalanceConsumptions).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    stealthAddress: stealthAddress.toLowerCase() as `0x${string}`,
    asset: asset.toLowerCase() as `0x${string}`,
    amount,
    consumer: consumer.toLowerCase() as `0x${string}`,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonRegistry:PrivacyPoolAuthorized', async ({ event, context }) => {
  const { pool, authorized } = event.args

  await context.db
    .insert(schema.authorizedPools)
    .values({
      id: pool.toLowerCase() as `0x${string}`,
      authorized,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      chainId: context.chain.id,
    })
    .onConflictDoUpdate({
      authorized,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
})

ponder.on('GaleonRegistry:StealthAddressFrozen', async ({ event, context }) => {
  const { stealthAddress, frozen } = event.args

  await context.db
    .insert(schema.frozenAddresses)
    .values({
      id: stealthAddress.toLowerCase() as `0x${string}`,
      frozen,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      chainId: context.chain.id,
    })
    .onConflictDoUpdate({
      frozen,
      blockNumber: event.block.number,
      blockTimestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
    })
})

// ============================================================
// GaleonEntrypoint Events
// ============================================================

// Track ASP root count for indexing
let aspRootIndex = 0

ponder.on('GaleonEntrypoint:RootUpdated', async ({ event, context }) => {
  const { root, ipfsCID, timestamp } = event.args

  // Convert uint256 to hex string
  const rootHex = `0x${root.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.aspRoots).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    root: rootHex,
    ipfsCID,
    timestamp,
    rootIndex: aspRootIndex++,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonEntrypoint:PoolRegistered', async ({ event, context }) => {
  const { pool, asset, scope } = event.args

  const scopeHex = `0x${scope.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.pools).values({
    id: pool.toLowerCase() as `0x${string}`,
    asset: asset.toLowerCase() as `0x${string}`,
    scope: scopeHex,
    minimumDepositAmount: 0n,
    vettingFeeBPS: 0,
    maxRelayFeeBPS: 0,
    active: true,
    dead: false,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonEntrypoint:PoolRemoved', async ({ event, context }) => {
  const { pool } = event.args

  await context.db.update(schema.pools, { id: pool.toLowerCase() as `0x${string}` }).set({
    active: false,
  })
})

ponder.on('GaleonEntrypoint:PoolConfigurationUpdated', async ({ event, context }) => {
  const { pool, newMinimumDepositAmount, newVettingFeeBPS, newMaxRelayFeeBPS } = event.args

  await context.db.update(schema.pools, { id: pool.toLowerCase() as `0x${string}` }).set({
    minimumDepositAmount: newMinimumDepositAmount,
    vettingFeeBPS: Number(newVettingFeeBPS),
    maxRelayFeeBPS: Number(newMaxRelayFeeBPS),
  })
})

ponder.on('GaleonEntrypoint:PoolWindDown', async ({ event, context }) => {
  const { pool } = event.args

  await context.db.update(schema.pools, { id: pool.toLowerCase() as `0x${string}` }).set({
    dead: true,
    active: false,
  })
})

ponder.on('GaleonEntrypoint:WithdrawalRelayed', async ({ event, context }) => {
  const { relayer, recipient, asset, feeAmount } = event.args

  // This event is emitted alongside Withdrawn - we update the withdrawal record
  // The Withdrawn event should be processed first, creating the base record
  // We match by transaction hash to find the withdrawal in this tx
  const withdrawalId = `${event.transaction.hash}-${event.log.logIndex - 1}`

  try {
    await context.db.update(schema.poolWithdrawals, { id: withdrawalId }).set({
      relayer: relayer.toLowerCase() as `0x${string}`,
      recipient: recipient.toLowerCase() as `0x${string}`,
      asset: asset.toLowerCase() as `0x${string}`,
      feeAmount,
    })
  } catch {
    // If the withdrawal wasn't found, the events may be in different order
    // This is a best-effort update
  }
})

// ============================================================
// GaleonPrivacyPool Events (dynamically discovered via factory pattern)
// ============================================================
ponder.on('GaleonPrivacyPool:Deposited', async ({ event, context }) => {
  const { depositor, commitment, label, value, precommitmentHash } = event.args

  const commitmentHex = `0x${commitment.toString(16).padStart(64, '0')}` as `0x${string}`
  const labelHex = `0x${label.toString(16).padStart(64, '0')}` as `0x${string}`
  const precommitmentHashHex =
    `0x${precommitmentHash.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolDeposits).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    depositor: depositor.toLowerCase() as `0x${string}`,
    commitment: commitmentHex,
    label: labelHex,
    value,
    precommitmentHash: precommitmentHashHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:Withdrawn', async ({ event, context }) => {
  const { processooor, value, spentNullifier, newCommitment } = event.args

  const nullifierHex = `0x${spentNullifier.toString(16).padStart(64, '0')}` as `0x${string}`
  const newCommitmentHex = `0x${newCommitment.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolWithdrawals).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    processooor: processooor.toLowerCase() as `0x${string}`,
    value,
    spentNullifier: nullifierHex,
    newCommitment: newCommitmentHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:Ragequit', async ({ event, context }) => {
  const { ragequitter, commitment, label, value } = event.args

  const commitmentHex = `0x${commitment.toString(16).padStart(64, '0')}` as `0x${string}`
  const labelHex = `0x${label.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolRagequits).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    ragequitter: ragequitter.toLowerCase() as `0x${string}`,
    commitment: commitmentHex,
    label: labelHex,
    value,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:PoolDied', async ({ event, context }) => {
  await context.db
    .update(schema.pools, { id: event.log.address.toLowerCase() as `0x${string}` })
    .set({
      dead: true,
      active: false,
    })
})

ponder.on('GaleonPrivacyPool:DepositorBlocklistUpdated', async ({ event, context }) => {
  const { depositor, blocked } = event.args

  await context.db.insert(schema.blocklistUpdates).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    depositor: depositor.toLowerCase() as `0x${string}`,
    blocked,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:LeafInserted', async ({ event, context }) => {
  const { index, leaf, root } = event.args

  const leafHex = `0x${leaf.toString(16).padStart(64, '0')}` as `0x${string}`
  const rootHex = `0x${root.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.merkleLeaves).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    leafIndex: index,
    leaf: leafHex,
    root: rootHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})
