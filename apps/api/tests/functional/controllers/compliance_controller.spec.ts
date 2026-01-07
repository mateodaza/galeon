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
    tokenAddress: string | null
    blockNumber: string
    chainId: number
    createdAt: Date
  }> = {}
) {
  const receipt = new Receipt()
  receipt.portId = portId
  receipt.txHash = overrides.txHash ?? validTxHash
  receipt.chainId = overrides.chainId ?? 5000
  receipt.status = overrides.status ?? 'confirmed'
  receipt.receiptHash = overrides.receiptHash ?? '0x' + 'd'.repeat(64)
  receipt.stealthAddress = overrides.stealthAddress ?? '0x' + 'e'.repeat(40)
  receipt.ephemeralPubKey = overrides.ephemeralPubKey ?? '0x' + 'f'.repeat(66)
  receipt.viewTag = overrides.viewTag ?? 42
  receipt.payerAddress = overrides.payerAddress ?? '0x' + '1'.repeat(40)
  receipt.amount = overrides.amount ?? '1000000000000000000'
  receipt.currency = overrides.currency ?? 'MNT'
  receipt.tokenAddress = overrides.tokenAddress ?? null
  receipt.blockNumber = overrides.blockNumber ?? '12345678'

  await receipt.save()

  // If custom createdAt is provided, update it directly
  if (overrides.createdAt) {
    await db
      .from('receipts')
      .where('id', receipt.id)
      .update({ created_at: overrides.createdAt.toISOString() })
    await receipt.refresh()
  }

  return receipt
}

test.group('ComplianceController', (group) => {
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
  // GET /api/v1/compliance/tax-summary - JSON Report
  // =============================================================================

  test('GET /compliance/tax-summary requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/compliance/tax-summary').qs({
      period: 'annual',
      year: 2024,
    })

    response.assertStatus(401)
  })

  test('GET /compliance/tax-summary requires period parameter', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  test('GET /compliance/tax-summary validates period enum', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'invalid' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  test('GET /compliance/tax-summary annual period requires year', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(400)
    response.assertBodyContains({ error: 'Year is required for annual period' })
  })

  test('GET /compliance/tax-summary quarterly period requires year and quarter', async ({
    client,
  }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'quarterly', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(400)
    response.assertBodyContains({ error: 'Year and quarter are required' })
  })

  test('GET /compliance/tax-summary monthly period requires year and month', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'monthly', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(400)
    response.assertBodyContains({ error: 'Year and month are required' })
  })

  test('GET /compliance/tax-summary custom period requires startDate and endDate', async ({
    client,
  }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'custom', startDate: '2024-01-01' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(400)
    response.assertBodyContains({ error: 'startDate and endDate required for custom period' })
  })

  test('GET /compliance/tax-summary returns empty report when no receipts', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.exists(response.body().reportId)
    assert.equal(response.body().reportType, 'tax_summary_co')
    assert.equal(response.body().summary.totalTransactions, 0)
    assert.equal(response.body().summary.grandTotalCop, 0)
    assert.lengthOf(response.body().transactions, 0)
  })

  test('GET /compliance/tax-summary returns report with transactions', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create receipts in 2024
    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '1000000000000000000', // 1 MNT
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      amount: '2000000000000000000', // 2 MNT
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-06-20'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().summary.totalTransactions, 2)
    assert.lengthOf(response.body().transactions, 2)
    assert.isAbove(response.body().summary.grandTotalCop, 0)
  })

  test('GET /compliance/tax-summary filters by date range', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create receipt in Q1 2024
    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '1000000000000000000',
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-02-15'),
    })

    // Create receipt in Q3 2024
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      amount: '2000000000000000000',
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-08-15'),
    })

    // Query only Q1
    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'quarterly', year: 2024, quarter: 1 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().summary.totalTransactions, 1)
    assert.equal(response.body().period.quarter, 1)
  })

  test('GET /compliance/tax-summary filters by portId', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port1 = await createTestPort(user.id, 'st:mnt:0x' + '1'.repeat(132))
    const port2 = await createTestPort(user.id, 'st:mnt:0x' + '2'.repeat(132))

    await createTestReceipt(port1.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '1000000000000000000',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    await createTestReceipt(port2.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      amount: '2000000000000000000',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024, portId: port1.id })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().summary.totalTransactions, 1)
    assert.lengthOf(response.body().ports, 1)
    assert.equal(response.body().ports[0].portId, port1.id)
  })

  test('GET /compliance/tax-summary only includes confirmed and collected receipts', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create pending receipt (should NOT be included)
    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '1000000000000000000',
      status: 'pending',
      createdAt: new Date('2024-06-15'),
    })

    // Create confirmed receipt (should be included)
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      amount: '2000000000000000000',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    // Create collected receipt (should be included)
    await createTestReceipt(port.id, {
      txHash: '0x' + '3'.repeat(64),
      receiptHash: '0x' + 'c'.repeat(64),
      amount: '3000000000000000000',
      status: 'collected',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().summary.totalTransactions, 2)
  })

  test('GET /compliance/tax-summary does not include other users receipts', async ({
    client,
    assert,
  }) => {
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
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    await createTestReceipt(port2.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${token1}`)

    response.assertStatus(200)
    assert.equal(response.body().summary.totalTransactions, 1)
  })

  test('GET /compliance/tax-summary returns correct compliance info', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().compliance.jurisdiction, 'CO')
    assert.equal(response.body().compliance.uiafThreshold, 600_000)
    assert.exists(response.body().compliance.note)
  })

  test('GET /compliance/tax-summary returns metadata with rates', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.exists(response.body().metadata.ratesUsed)
    assert.equal(response.body().metadata.rateSource, 'hardcoded_mvp')
    assert.equal(response.body().metadata.generatedBy, 'galeon-api')
  })

  test('GET /compliance/tax-summary counts transactions above UIAF threshold', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create small receipt (below threshold)
    // 100 MNT = 400,000 COP (below 600,000 threshold)
    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '100000000000000000000', // 100 MNT
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    // Create large receipt (above threshold)
    // 200 MNT = 800,000 COP (above 600,000 threshold)
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      amount: '200000000000000000000', // 200 MNT
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().compliance.transactionsAboveThreshold, 1)
  })

  test('GET /compliance/tax-summary monthly period works correctly', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'monthly', year: 2024, month: 6 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().period.type, 'monthly')
    assert.equal(response.body().period.year, 2024)
    assert.equal(response.body().period.month, 6)
    assert.equal(response.body().summary.totalTransactions, 1)
  })

  test('GET /compliance/tax-summary custom period works correctly', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'custom', startDate: '2024-06-01', endDate: '2024-06-30' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().period.type, 'custom')
    assert.equal(response.body().period.startDate, '2024-06-01')
    assert.equal(response.body().period.endDate, '2024-06-30')
    assert.equal(response.body().summary.totalTransactions, 1)
  })

  test('GET /compliance/tax-summary aggregates by token correctly', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    // Create MNT receipt
    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '1000000000000000000', // 1 MNT
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    // Create USDC receipt (via ERC20)
    await createTestReceipt(port.id, {
      txHash: '0x' + '2'.repeat(64),
      receiptHash: '0x' + 'b'.repeat(64),
      amount: '100000000', // 100 USDC
      currency: 'ERC20',
      tokenAddress: '0x09bc4e0d864854c6afb6eb9a9cdf58ac190d0df9', // Mantle USDC
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().summary.totalReceivedByToken, 2)

    const mntToken = response
      .body()
      .summary.totalReceivedByToken.find((t: { symbol: string }) => t.symbol === 'MNT')
    const usdcToken = response
      .body()
      .summary.totalReceivedByToken.find((t: { symbol: string }) => t.symbol === 'USDC')

    assert.exists(mntToken)
    assert.exists(usdcToken)
    assert.equal(mntToken.transactionCount, 1)
    assert.equal(usdcToken.transactionCount, 1)
  })

  // =============================================================================
  // GET /api/v1/compliance/tax-summary/pdf - PDF Report
  // =============================================================================

  test('GET /compliance/tax-summary/pdf requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/compliance/tax-summary/pdf').qs({
      period: 'annual',
      year: 2024,
    })

    response.assertStatus(401)
  })

  test('GET /compliance/tax-summary/pdf returns PDF content type', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/compliance/tax-summary/pdf')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')
    assert.include(response.header('content-disposition'), 'attachment')
    assert.include(response.header('content-disposition'), '.pdf')
  })

  test('GET /compliance/tax-summary/pdf filename includes period label', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    await createTestPort(user.id)

    const response = await client
      .get('/api/v1/compliance/tax-summary/pdf')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    // Should contain year in filename
    assert.include(response.header('content-disposition'), '2024')
  })

  test('GET /compliance/tax-summary/pdf requires valid period params', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary/pdf')
      .qs({ period: 'annual' }) // Missing year
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(400)
  })

  test('GET /compliance/tax-summary/pdf with receipts returns valid PDF', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)
    const port = await createTestPort(user.id)

    await createTestReceipt(port.id, {
      txHash: '0x' + '1'.repeat(64),
      receiptHash: '0x' + 'a'.repeat(64),
      amount: '1000000000000000000',
      currency: 'MNT',
      status: 'confirmed',
      createdAt: new Date('2024-06-15'),
    })

    const response = await client
      .get('/api/v1/compliance/tax-summary/pdf')
      .qs({ period: 'annual', year: 2024 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.header('content-type'), 'application/pdf')

    // PDF should have content length > 0
    const contentLength = parseInt(response.header('content-length') ?? '0', 10)
    assert.isAbove(contentLength, 0)
  })

  // =============================================================================
  // Validation Tests
  // =============================================================================

  test('validates year range (2020-2030)', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2019 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  test('validates quarter range (1-4)', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'quarterly', year: 2024, quarter: 5 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  test('validates month range (1-12)', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'monthly', year: 2024, month: 13 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  test('validates date format for custom period', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'custom', startDate: '2024/01/01', endDate: '2024-12-31' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  test('validates portId as UUID', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/compliance/tax-summary')
      .qs({ period: 'annual', year: 2024, portId: 'not-a-uuid' })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })
})
