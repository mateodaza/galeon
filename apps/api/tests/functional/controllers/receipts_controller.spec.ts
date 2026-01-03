import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { SiweMessage } from 'siwe'
import { Wallet } from 'ethers'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import type User from '#models/user'
import Port from '#models/port'
import Receipt from '#models/receipt'

// Test wallet (Hardhat's first test account)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const testWallet = new Wallet(TEST_PRIVATE_KEY)
const TEST_WALLET_ADDRESS = testWallet.address

// Second test wallet for isolation tests
const TEST_PRIVATE_KEY_2 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const testWallet2 = new Wallet(TEST_PRIVATE_KEY_2)
const TEST_WALLET_ADDRESS_2 = testWallet2.address

// Valid test data
const validStealthMetaAddress = 'st:mnt:0x' + 'a'.repeat(132)
const validViewingKey = '0x' + 'b'.repeat(64)
const validTxHash = '0x' + 'c'.repeat(64)

async function authenticateUser(
  client: ApiClient,
  wallet: Wallet = testWallet,
  walletAddress: string = TEST_WALLET_ADDRESS
): Promise<{ accessToken: string; user: User }> {
  const nonceResponse = await client.get('/api/v1/auth/nonce').qs({ walletAddress })
  const { nonce, chainId } = nonceResponse.body()

  const siweMessage = new SiweMessage({
    domain: 'localhost',
    address: walletAddress,
    statement: 'Sign in to Galeon',
    uri: 'http://localhost:3333',
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  })

  const message = siweMessage.prepareMessage()
  const signature = await wallet.signMessage(message)

  const authResponse = await client.post('/api/v1/auth/verify').json({ message, signature })
  const { accessToken, user } = authResponse.body()

  return { accessToken, user }
}

async function createTestPort(userId: number, stealthMetaAddress?: string) {
  return Port.create({
    userId,
    name: 'Test Port',
    type: 'permanent',
    stealthMetaAddress: stealthMetaAddress ?? validStealthMetaAddress,
    viewingKeyEncrypted: Port.encryptViewingKey(validViewingKey),
    archived: false,
  })
}

async function createTestReceipt(
  portId: string,
  overrides: Partial<{
    txHash: string
    status: 'pending' | 'confirmed' | 'collected'
    receiptHash: string
    stealthAddress: string
    ephemeralPubKey: string
    viewTag: number
    payerAddress: string
    amount: string
    currency: string
    blockNumber: string
    chainId: number
  }> = {}
) {
  return Receipt.create({
    portId,
    txHash: overrides.txHash ?? validTxHash,
    chainId: overrides.chainId ?? 5000,
    status: overrides.status ?? 'confirmed',
    receiptHash: overrides.receiptHash ?? '0x' + 'd'.repeat(64),
    stealthAddress: overrides.stealthAddress ?? '0x' + 'e'.repeat(40),
    ephemeralPubKey: overrides.ephemeralPubKey ?? '0x' + 'f'.repeat(66),
    viewTag: overrides.viewTag ?? 42,
    payerAddress: overrides.payerAddress ?? '0x' + '1'.repeat(40),
    amount: overrides.amount ?? '1000000000000000000',
    currency: overrides.currency ?? 'ETH',
    blockNumber: overrides.blockNumber ?? '12345678',
  })
}

test.group('ReceiptsController', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return async () => {
      await db.rollbackGlobalTransaction()
    }
  })

  group.each.teardown(async () => {
    const nonceKeys = await redis.keys('siwe:nonce:*')
    const blacklistKeys = await redis.keys('token:blacklist:*')
    const allKeys = [...nonceKeys, ...blacklistKeys]
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
    }
  })

  // =============================================================================
  // POST /api/v1/receipts - Create Pending Receipt
  // =============================================================================

  test('POST /receipts creates a pending receipt', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: validTxHash,
        portId: port.id,
        chainId: 5000,
      })

    response.assertStatus(201)
    assert.exists(response.body().id)
    assert.equal(response.body().txHash, validTxHash)
    assert.equal(response.body().portId, port.id)
    assert.equal(response.body().chainId, 5000)
    assert.equal(response.body().status, 'pending')
    assert.exists(response.body().createdAt)
  })

  test('POST /receipts requires authentication', async ({ client }) => {
    const response = await client.post('/api/v1/receipts').json({
      transactionHash: validTxHash,
      portId: '00000000-0000-0000-0000-000000000000',
      chainId: 5000,
    })

    response.assertStatus(401)
  })

  test('POST /receipts returns 404 for non-existent port', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: validTxHash,
        portId: '00000000-0000-0000-0000-000000000000',
        chainId: 5000,
      })

    response.assertStatus(404)
    response.assertBodyContains({ error: 'Port not found' })
  })

  test('POST /receipts returns 404 for other users port', async ({ client }) => {
    const { user: user1 } = await authenticateUser(client, testWallet, TEST_WALLET_ADDRESS)
    const { accessToken: token2 } = await authenticateUser(
      client,
      testWallet2,
      TEST_WALLET_ADDRESS_2
    )
    const port = await createTestPort(user1.id)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${token2}`)
      .json({
        transactionHash: validTxHash,
        portId: port.id,
        chainId: 5000,
      })

    response.assertStatus(404)
    response.assertBodyContains({ error: 'Port not found' })
  })

  test('POST /receipts returns 409 for duplicate transaction hash', async ({ client }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create first receipt
    await client.post('/api/v1/receipts').header('Authorization', `Bearer ${accessToken}`).json({
      transactionHash: validTxHash,
      portId: port.id,
      chainId: 5000,
    })

    // Try to create duplicate
    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: validTxHash,
        portId: port.id,
        chainId: 5000,
      })

    response.assertStatus(409)
    response.assertBodyContains({ error: 'Receipt with this transaction hash already exists' })
  })

  test('POST /receipts validates transaction hash format', async ({ client }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: 'invalid-hash',
        portId: port.id,
        chainId: 5000,
      })

    response.assertStatus(422)
  })

  test('POST /receipts validates portId as UUID', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: validTxHash,
        portId: 'not-a-uuid',
        chainId: 5000,
      })

    response.assertStatus(422)
  })

  test('POST /receipts requires chainId', async ({ client }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: validTxHash,
        portId: port.id,
      })

    response.assertStatus(422)
  })

  test('POST /receipts lowercases transaction hash', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)
    const upperCaseTxHash = '0x' + 'C'.repeat(64)

    const response = await client
      .post('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        transactionHash: upperCaseTxHash,
        portId: port.id,
        chainId: 5000,
      })

    response.assertStatus(201)
    assert.equal(response.body().txHash, upperCaseTxHash.toLowerCase())
  })

  // =============================================================================
  // GET /api/v1/receipts - List Receipts
  // =============================================================================

  test('GET /receipts returns empty array when user has no receipts', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 0)
    assert.equal(response.body().meta.total, 0)
  })

  test('GET /receipts returns user receipts', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
    })
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
    })

    const response = await client
      .get('/api/v1/receipts')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
    assert.equal(response.body().meta.total, 2)
  })

  test('GET /receipts filters by portId', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port1 = await createTestPort(user.id, 'st:mnt:0x' + '1'.repeat(132))
    const port2 = await createTestPort(user.id, 'st:mnt:0x' + '2'.repeat(132))

    await createTestReceipt(port1.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
    })
    await createTestReceipt(port2.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
    })

    const response = await client
      .get('/api/v1/receipts')
      .qs({ portId: port1.id })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].portId, port1.id)
  })

  test('GET /receipts filters by status', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      status: 'pending',
    })
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      status: 'confirmed',
    })

    const response = await client
      .get('/api/v1/receipts')
      .qs({ status: 'pending' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].status, 'pending')
  })

  test('GET /receipts does not return other users receipts', async ({ client, assert }) => {
    const { accessToken: token1, user: user1 } = await authenticateUser(
      client,
      testWallet,
      TEST_WALLET_ADDRESS
    )
    const { user: user2 } = await authenticateUser(client, testWallet2, TEST_WALLET_ADDRESS_2)

    const port1 = await createTestPort(user1.id, 'st:mnt:0x' + '1'.repeat(132))
    const port2 = await createTestPort(user2.id, 'st:mnt:0x' + '2'.repeat(132))

    await createTestReceipt(port1.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
    })
    await createTestReceipt(port2.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
    })

    const response = await client
      .get('/api/v1/receipts')
      .header('Authorization', `Bearer ${token1}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
  })

  test('GET /receipts requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/receipts')

    response.assertStatus(401)
  })

  test('GET /receipts supports pagination', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create 5 receipts
    for (let i = 0; i < 5; i++) {
      await createTestReceipt(port.id, {
        txHash: '0x' + i.toString().repeat(64).slice(0, 64),
        receiptHash: '0x' + (i + 10).toString(16).padStart(64, '0'),
      })
    }

    const response = await client
      .get('/api/v1/receipts')
      .qs({ page: 1, limit: 2 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
    assert.equal(response.body().meta.total, 5)
    assert.equal(response.body().meta.perPage, 2)
    assert.equal(response.body().meta.currentPage, 1)
    assert.equal(response.body().meta.lastPage, 3)
  })

  // =============================================================================
  // GET /api/v1/receipts/:id - Get Single Receipt
  // =============================================================================

  test('GET /receipts/:id returns a single receipt', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)
    const receipt = await createTestReceipt(port.id)

    const response = await client
      .get(`/api/v1/receipts/${receipt.id}`)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().id, receipt.id)
    assert.equal(response.body().txHash, receipt.txHash)
    assert.equal(response.body().receiptHash, receipt.receiptHash)
    assert.equal(response.body().stealthAddress, receipt.stealthAddress)
    assert.equal(response.body().amount, receipt.amount)
    assert.equal(response.body().status, receipt.status)
  })

  test('GET /receipts/:id returns 404 for non-existent receipt', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/receipts/00000000-0000-0000-0000-000000000000')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(404)
    response.assertBodyContains({ error: 'Receipt not found' })
  })

  test('GET /receipts/:id returns 404 for other users receipt', async ({ client }) => {
    const { user: user1 } = await authenticateUser(client, testWallet, TEST_WALLET_ADDRESS)
    const { accessToken: token2 } = await authenticateUser(
      client,
      testWallet2,
      TEST_WALLET_ADDRESS_2
    )

    const port = await createTestPort(user1.id)
    const receipt = await createTestReceipt(port.id)

    const response = await client
      .get(`/api/v1/receipts/${receipt.id}`)
      .header('Authorization', `Bearer ${token2}`)

    response.assertStatus(404)
  })

  test('GET /receipts/:id requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/receipts/some-id')

    response.assertStatus(401)
  })

  test('GET /receipts/:id validates UUID format', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/receipts/not-a-uuid')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  // =============================================================================
  // GET /api/v1/receipts/stats - Get Receipt Statistics
  // =============================================================================

  test('GET /receipts/stats returns zero stats when no receipts', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/receipts/stats')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().totalReceipts, 0)
    assert.equal(response.body().pendingReceipts, 0)
    assert.equal(response.body().confirmedReceipts, 0)
    assert.equal(response.body().collectedReceipts, 0)
    assert.equal(response.body().totalPending, '0')
    assert.equal(response.body().totalConfirmed, '0')
    assert.equal(response.body().totalCollected, '0')
  })

  test('GET /receipts/stats calculates correct statistics', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      status: 'pending',
      amount: '1000000000000000000', // 1 ETH
    })
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      status: 'confirmed',
      amount: '2000000000000000000', // 2 ETH
    })
    await createTestReceipt(port.id, {
      txHash: '0x' + '3'.repeat(64),
      receiptHash: '0x' + 'c'.repeat(64),
      status: 'collected',
      amount: '3000000000000000000', // 3 ETH
    })

    const response = await client
      .get('/api/v1/receipts/stats')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().totalReceipts, 3)
    assert.equal(response.body().pendingReceipts, 1)
    assert.equal(response.body().confirmedReceipts, 1)
    assert.equal(response.body().collectedReceipts, 1)
    assert.equal(response.body().totalPending, '1000000000000000000')
    assert.equal(response.body().totalConfirmed, '2000000000000000000')
    assert.equal(response.body().totalCollected, '3000000000000000000')
  })

  test('GET /receipts/stats requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/receipts/stats')

    response.assertStatus(401)
  })
})
