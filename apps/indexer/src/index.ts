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
  const { _root, _ipfsCID, _timestamp } = event.args

  // Convert uint256 to hex string
  const rootHex = `0x${_root.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.aspRoots).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    root: rootHex,
    ipfsCID: _ipfsCID,
    timestamp: _timestamp,
    rootIndex: aspRootIndex++,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonEntrypoint:PoolRegistered', async ({ event, context }) => {
  const { _pool, _asset, _scope } = event.args

  const scopeHex = `0x${_scope.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.pools).values({
    id: _pool.toLowerCase() as `0x${string}`,
    asset: _asset.toLowerCase() as `0x${string}`,
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
  const { _pool } = event.args

  await context.db.update(schema.pools, { id: _pool.toLowerCase() as `0x${string}` }).set({
    active: false,
  })
})

ponder.on('GaleonEntrypoint:PoolConfigurationUpdated', async ({ event, context }) => {
  const { _pool, _newMinimumDepositAmount, _newVettingFeeBPS, _newMaxRelayFeeBPS } = event.args

  await context.db.update(schema.pools, { id: _pool.toLowerCase() as `0x${string}` }).set({
    minimumDepositAmount: _newMinimumDepositAmount,
    vettingFeeBPS: Number(_newVettingFeeBPS),
    maxRelayFeeBPS: Number(_newMaxRelayFeeBPS),
  })
})

ponder.on('GaleonEntrypoint:PoolWindDown', async ({ event, context }) => {
  const { _pool } = event.args

  await context.db.update(schema.pools, { id: _pool.toLowerCase() as `0x${string}` }).set({
    dead: true,
    active: false,
  })
})

ponder.on('GaleonEntrypoint:WithdrawalRelayed', async ({ event, context }) => {
  const { _relayer, _recipient, _asset, _feeAmount } = event.args

  // This event is emitted alongside Withdrawn - we update the withdrawal record
  // The Withdrawn event should be processed first, creating the base record
  // We match by transaction hash to find the withdrawal in this tx
  const withdrawalId = `${event.transaction.hash}-${event.log.logIndex - 1}`

  try {
    await context.db.update(schema.poolWithdrawals, { id: withdrawalId }).set({
      relayer: _relayer.toLowerCase() as `0x${string}`,
      recipient: _recipient.toLowerCase() as `0x${string}`,
      asset: _asset.toLowerCase() as `0x${string}`,
      feeAmount: _feeAmount,
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
  const { _depositor, _commitment, _label, _value, _precommitmentHash } = event.args

  const commitmentHex = `0x${_commitment.toString(16).padStart(64, '0')}` as `0x${string}`
  const labelHex = `0x${_label.toString(16).padStart(64, '0')}` as `0x${string}`
  const precommitmentHashHex =
    `0x${_precommitmentHash.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolDeposits).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    depositor: _depositor.toLowerCase() as `0x${string}`,
    commitment: commitmentHex,
    label: labelHex,
    value: _value,
    precommitmentHash: precommitmentHashHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:Withdrawn', async ({ event, context }) => {
  const { _processooor, _value, _spentNullifier, _newCommitment } = event.args

  const nullifierHex = `0x${_spentNullifier.toString(16).padStart(64, '0')}` as `0x${string}`
  const newCommitmentHex = `0x${_newCommitment.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolWithdrawals).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    processooor: _processooor.toLowerCase() as `0x${string}`,
    value: _value,
    spentNullifier: nullifierHex,
    newCommitment: newCommitmentHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:MergeDeposited', async ({ event, context }) => {
  const { _depositor, _depositValue, _existingNullifierHash, _newCommitmentHash } = event.args

  const existingNullifierHex =
    `0x${_existingNullifierHash.toString(16).padStart(64, '0')}` as `0x${string}`
  const newCommitmentHex = `0x${_newCommitmentHash.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolMergeDeposits).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    depositor: _depositor.toLowerCase() as `0x${string}`,
    depositValue: _depositValue,
    existingNullifierHash: existingNullifierHex,
    newCommitment: newCommitmentHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})

ponder.on('GaleonPrivacyPool:Ragequit', async ({ event, context }) => {
  const { _ragequitter, _commitment, _label, _value } = event.args

  const commitmentHex = `0x${_commitment.toString(16).padStart(64, '0')}` as `0x${string}`
  const labelHex = `0x${_label.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.poolRagequits).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    ragequitter: _ragequitter.toLowerCase() as `0x${string}`,
    commitment: commitmentHex,
    label: labelHex,
    value: _value,
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
  const { _index, _leaf, _root } = event.args

  const leafHex = `0x${_leaf.toString(16).padStart(64, '0')}` as `0x${string}`
  const rootHex = `0x${_root.toString(16).padStart(64, '0')}` as `0x${string}`

  await context.db.insert(schema.merkleLeaves).values({
    id: `${event.transaction.hash}-${event.log.logIndex}`,
    pool: event.log.address.toLowerCase() as `0x${string}`,
    leafIndex: _index,
    leaf: leafHex,
    root: rootHex,
    blockNumber: event.block.number,
    blockTimestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    logIndex: event.log.logIndex,
    chainId: context.chain.id,
  })
})
