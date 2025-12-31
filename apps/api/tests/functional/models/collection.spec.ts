import { test } from '@japa/runner'
import User from '#models/user'
import Port from '#models/port'
import Receipt from '#models/receipt'
import Collection from '#models/collection'
import db from '@adonisjs/lucid/services/db'

test.group('Collection Model - Database', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  async function createUserPortAndReceipts() {
    const user = await User.create({
      walletAddress: '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0'),
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      name: 'Collection Test Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      viewingKeyEncrypted: 'encrypted_key',
      viewingKeyNonce: 'nonce_collection_test',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    const receipts = await Receipt.createMany([
      {
        portId: port.id,
        receiptHash: '0x' + 'r1'.repeat(32),
        stealthAddress: '0x' + 's1'.repeat(20),
        ephemeralPubKey: '0x04' + 'e1'.repeat(64),
        viewTag: 1,
        payerAddress: '0x' + 'p1'.repeat(20),
        amount: '1000000000000000000',
        currency: 'MNT',
        tokenAddress: null,
        memo: null,
        txHash: '0x' + 't1'.repeat(32),
        blockNumber: '1000',
        chainId: 5003,
        status: 'confirmed',
      },
      {
        portId: port.id,
        receiptHash: '0x' + 'r2'.repeat(32),
        stealthAddress: '0x' + 's2'.repeat(20),
        ephemeralPubKey: '0x04' + 'e2'.repeat(64),
        viewTag: 2,
        payerAddress: '0x' + 'p2'.repeat(20),
        amount: '2000000000000000000',
        currency: 'MNT',
        tokenAddress: null,
        memo: null,
        txHash: '0x' + 't2'.repeat(32),
        blockNumber: '1001',
        chainId: 5003,
        status: 'confirmed',
      },
    ])

    return { user, port, receipts }
  }

  test('can create a collection', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'recipient'.repeat(4).slice(0, 40),
      status: 'pending',
      totalReceipts: 2,
      processedReceipts: 0,
      totalAmount: '3000000000000000000',
      tokenAmounts: {},
    })

    assert.exists(collection.id)
    assert.equal(collection.userId, user.id)
    assert.equal(collection.status, 'pending')
    assert.equal(collection.totalReceipts, 2)
    assert.equal(collection.totalAmount, '3000000000000000000')
  })

  test('collection belongs to user relationship', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'recip1'.repeat(6).slice(0, 40),
      status: 'pending',
      totalReceipts: 1,
      processedReceipts: 0,
      totalAmount: '1000000000000000000',
      tokenAmounts: {},
    })

    await collection.load('user')

    assert.equal(collection.user.id, user.id)
  })

  test('user has many collections relationship', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    await Collection.createMany([
      {
        userId: user.id,
        recipientWallet: '0x' + 'rcpt1'.repeat(8).slice(0, 40),
        status: 'completed',
        totalReceipts: 1,
        processedReceipts: 1,
        totalAmount: '1000000000000000000',
        tokenAmounts: {},
      },
      {
        userId: user.id,
        recipientWallet: '0x' + 'rcpt2'.repeat(8).slice(0, 40),
        status: 'pending',
        totalReceipts: 2,
        processedReceipts: 0,
        totalAmount: '2000000000000000000',
        tokenAmounts: {},
      },
    ])

    await user.load('collections')

    assert.lengthOf(user.collections, 2)
  })

  test('collection has many receipts relationship', async ({ assert }) => {
    const { user, receipts } = await createUserPortAndReceipts()

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'coll1'.repeat(8).slice(0, 40),
      status: 'processing',
      totalReceipts: 2,
      processedReceipts: 0,
      totalAmount: '3000000000000000000',
      tokenAmounts: {},
    })

    // Link receipts to collection
    for (const receipt of receipts) {
      receipt.collectionId = collection.id
      await receipt.save()
    }

    await collection.load('receipts')

    assert.lengthOf(collection.receipts, 2)
  })

  test('can store tokenAmounts as jsonb', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    const tokenAmounts = {
      '0x0000000000000000000000000000000000000000': '1000000000000000000',
      '0xUSDCContractAddress12345678901234567890': '5000000',
    }

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'multi'.repeat(8).slice(0, 40),
      status: 'pending',
      totalReceipts: 3,
      processedReceipts: 0,
      totalAmount: '1000000000000000000',
      tokenAmounts,
    })

    const refreshed = await Collection.find(collection.id)

    assert.deepEqual(refreshed?.tokenAmounts, tokenAmounts)
  })

  test('can update collection status through workflow', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'flow1'.repeat(8).slice(0, 40),
      status: 'pending',
      totalReceipts: 2,
      processedReceipts: 0,
      totalAmount: '2000000000000000000',
      tokenAmounts: {},
    })

    // Simulate workflow: pending -> processing
    collection.status = 'processing'
    await collection.save()

    let refreshed = await Collection.find(collection.id)
    assert.equal(refreshed?.status, 'processing')

    // processing -> completed
    collection.status = 'completed'
    collection.processedReceipts = 2
    collection.txHash = '0x' + 'finaltx'.repeat(9).slice(0, 64)
    await collection.save()

    refreshed = await Collection.find(collection.id)
    assert.equal(refreshed?.status, 'completed')
    assert.equal(refreshed?.processedReceipts, 2)
    assert.isNotNull(refreshed?.txHash)
  })

  test('can record failed collection with error', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'fail1'.repeat(8).slice(0, 40),
      status: 'processing',
      totalReceipts: 2,
      processedReceipts: 1,
      totalAmount: '2000000000000000000',
      tokenAmounts: {},
    })

    // Simulate failure
    collection.status = 'failed'
    collection.errorMessage = 'Transaction reverted: insufficient gas'
    await collection.save()

    const refreshed = await Collection.find(collection.id)
    assert.equal(refreshed?.status, 'failed')
    assert.equal(refreshed?.errorMessage, 'Transaction reverted: insufficient gas')
  })

  test('deleting user cascades to collections', async ({ assert }) => {
    const { user } = await createUserPortAndReceipts()

    const collection = await Collection.create({
      userId: user.id,
      recipientWallet: '0x' + 'cascade'.repeat(5).slice(0, 40),
      status: 'pending',
      totalReceipts: 1,
      processedReceipts: 0,
      totalAmount: '1000000000000000000',
      tokenAmounts: {},
    })

    const collectionId = collection.id
    await user.delete()

    const found = await Collection.find(collectionId)
    assert.isNull(found)
  })
})
