import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Port from '#models/port'
import Receipt from '#models/receipt'
import VerifyReceipts from '#jobs/verify_receipts'
import type { PonderAnnouncement, PonderReceiptAnchored } from '#services/ponder_service'

// Mock PonderService for testing
class MockPonderService {
  private mockAnnouncements: Map<string, PonderAnnouncement> = new Map()
  private mockReceiptsAnchored: Map<string, PonderReceiptAnchored> = new Map()

  addMockAnnouncement(txHash: string, announcement: PonderAnnouncement) {
    this.mockAnnouncements.set(txHash.toLowerCase(), announcement)
  }

  addMockReceiptAnchored(txHash: string, receiptAnchored: PonderReceiptAnchored) {
    this.mockReceiptsAnchored.set(txHash.toLowerCase(), receiptAnchored)
  }

  async findAnnouncementByTxHash(
    txHash: string,
    _chainId?: number
  ): Promise<PonderAnnouncement | null> {
    return this.mockAnnouncements.get(txHash.toLowerCase()) ?? null
  }

  async findReceiptAnchoredByTxHash(
    txHash: string,
    _chainId?: number
  ): Promise<PonderReceiptAnchored | null> {
    return this.mockReceiptsAnchored.get(txHash.toLowerCase()) ?? null
  }
}

test.group('VerifyReceipts Job', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  async function createTestPort(userId: number) {
    return Port.create({
      userId,
      name: 'Test Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'b'.repeat(64)),
      status: 'confirmed',
      chainId: 5000,
    })
  }

  test('verifies pending receipt when found in indexer', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1111111111111111111111111111111111111111',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'abc123'.repeat(11).slice(0, 64)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
    })

    // Set up mock announcement
    const mockService = new MockPonderService()
    const stealthAddr = '0x' + 's'.repeat(40)
    const payerAddr = '0x' + 'p'.repeat(40)
    const ephemeralKey = '0x' + 'e'.repeat(64)
    mockService.addMockAnnouncement(txHash, {
      id: 'announcement-1',
      schemeId: '1',
      stealthAddress: stealthAddr,
      caller: payerAddr,
      ephemeralPubKey: ephemeralKey,
      metadata: '0x',
      viewTag: 42,
      receiptHash: '0x' + 'r'.repeat(64),
      blockNumber: '12345',
      blockTimestamp: '1234567890',
      transactionHash: txHash,
      logIndex: 0,
      chainId: 5000,
    })

    // Run the job
    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    // Verify the receipt was updated
    await receipt.refresh()
    assert.equal(receipt.status, 'confirmed')
    assert.equal(receipt.stealthAddress, stealthAddr)
    assert.equal(receipt.payerAddress, payerAddr)
    assert.equal(receipt.ephemeralPubKey, ephemeralKey)
    assert.equal(receipt.viewTag, 42)
    assert.equal(receipt.blockNumber, '12345')
  })

  test('fills amount and token from receipts_anchored', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x2222222222222222222222222222222222222222',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'withamt'.repeat(9).slice(0, 64)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
    })

    const mockService = new MockPonderService()
    mockService.addMockAnnouncement(txHash, {
      id: 'announcement-2',
      schemeId: '1',
      stealthAddress: '0x' + 'stealth2'.repeat(5),
      caller: '0x' + 'payer2'.repeat(5),
      ephemeralPubKey: '0x' + 'ephemeral2'.repeat(5),
      metadata: '0x',
      viewTag: 100,
      receiptHash: '0x' + 'hash2'.repeat(6),
      blockNumber: '54321',
      blockTimestamp: '9876543210',
      transactionHash: txHash,
      logIndex: 1,
      chainId: 5000,
    })

    // Add receipt anchored with amount
    mockService.addMockReceiptAnchored(txHash, {
      id: 'receipt-anchored-1',
      stealthAddress: '0x' + 'stealth2'.repeat(5),
      receiptHash: '0x' + 'hash2'.repeat(6),
      payer: '0x' + 'payer2'.repeat(5),
      amount: '1000000000000000000', // 1 ETH/MNT
      token: '0x0000000000000000000000000000000000000000', // Native token
      timestamp: '9876543210',
      blockNumber: '54321',
      transactionHash: txHash,
      logIndex: 2,
      chainId: 5000,
    })

    // Run the job
    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    // Verify amount was filled
    await receipt.refresh()
    assert.equal(receipt.status, 'confirmed')
    assert.equal(receipt.amount, '1000000000000000000')
    assert.isNull(receipt.tokenAddress) // Native token
    assert.equal(receipt.currency, 'MNT') // Mantle native token
  })

  test('sets ETH currency for non-Mantle chains', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x3333333333333333333333333333333333333333',
    })

    const port = await Port.create({
      userId: user.id,
      name: 'Ethereum Port',
      type: 'permanent',
      stealthMetaAddress: 'st:eth:0x' + 'c'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'd'.repeat(64)),
      status: 'confirmed',
      chainId: 1, // Ethereum mainnet
    })

    const txHash = '0x' + 'ethchain'.repeat(8)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 1, // Ethereum
      status: 'pending',
    })

    const mockService = new MockPonderService()
    mockService.addMockAnnouncement(txHash, {
      id: 'announcement-3',
      schemeId: '1',
      stealthAddress: '0x' + 'stealth3'.repeat(5),
      caller: '0x' + 'payer3'.repeat(5),
      ephemeralPubKey: '0x' + 'ephemeral3'.repeat(5),
      metadata: '0x',
      viewTag: 55,
      receiptHash: '0x' + 'hash3'.repeat(6),
      blockNumber: '11111',
      blockTimestamp: '1111111111',
      transactionHash: txHash,
      logIndex: 0,
      chainId: 1,
    })

    mockService.addMockReceiptAnchored(txHash, {
      id: 'receipt-anchored-2',
      stealthAddress: '0x' + 'stealth3'.repeat(5),
      receiptHash: '0x' + 'hash3'.repeat(6),
      payer: '0x' + 'payer3'.repeat(5),
      amount: '500000000000000000',
      token: '0x0000000000000000000000000000000000000000',
      timestamp: '1111111111',
      blockNumber: '11111',
      transactionHash: txHash,
      logIndex: 1,
      chainId: 1,
    })

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt.refresh()
    assert.equal(receipt.currency, 'ETH') // Not MNT
  })

  test('sets ERC20 currency and token address for token payments', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x4444444444444444444444444444444444444444',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'erc20pay'.repeat(8)
    const tokenAddress = '0x' + 'usdc'.repeat(10)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
    })

    const mockService = new MockPonderService()
    mockService.addMockAnnouncement(txHash, {
      id: 'announcement-4',
      schemeId: '1',
      stealthAddress: '0x' + 'stealth4'.repeat(5),
      caller: '0x' + 'payer4'.repeat(5),
      ephemeralPubKey: '0x' + 'ephemeral4'.repeat(5),
      metadata: '0x',
      viewTag: 200,
      receiptHash: '0x' + 'hash4'.repeat(6),
      blockNumber: '22222',
      blockTimestamp: '2222222222',
      transactionHash: txHash,
      logIndex: 0,
      chainId: 5000,
    })

    mockService.addMockReceiptAnchored(txHash, {
      id: 'receipt-anchored-3',
      stealthAddress: '0x' + 'stealth4'.repeat(5),
      receiptHash: '0x' + 'hash4'.repeat(6),
      payer: '0x' + 'payer4'.repeat(5),
      amount: '100000000', // 100 USDC (6 decimals)
      token: tokenAddress, // ERC20 token
      timestamp: '2222222222',
      blockNumber: '22222',
      transactionHash: txHash,
      logIndex: 1,
      chainId: 5000,
    })

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt.refresh()
    assert.equal(receipt.currency, 'ERC20')
    assert.equal(receipt.tokenAddress, tokenAddress)
  })

  test('leaves receipt as pending when not found in indexer', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x5555555555555555555555555555555555555555',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'notfound'.repeat(8)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
    })

    // Empty mock - not found
    const mockService = new MockPonderService()

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt.refresh()
    assert.equal(receipt.status, 'pending')
  })

  test('ignores already confirmed receipts', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x6666666666666666666666666666666666666666',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'c'.repeat(64)
    const existingPayer = '0x' + 'e'.repeat(40)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'confirmed',
      payerAddress: existingPayer,
      stealthAddress: '0x' + 'a'.repeat(40),
    })

    // Mock would return different data
    const mockService = new MockPonderService()
    mockService.addMockAnnouncement(txHash, {
      id: 'announcement-new',
      schemeId: '1',
      stealthAddress: '0x' + 'd'.repeat(40),
      caller: '0x' + 'd'.repeat(40),
      ephemeralPubKey: '0x' + 'd'.repeat(64),
      metadata: '0x',
      viewTag: 255,
      receiptHash: '0x' + 'diff'.repeat(10),
      blockNumber: '99999',
      blockTimestamp: '9999999999',
      transactionHash: txHash,
      logIndex: 0,
      chainId: 5000,
    })

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    // Should remain unchanged
    await receipt.refresh()
    assert.equal(receipt.payerAddress, existingPayer)
    assert.equal(receipt.stealthAddress, '0x' + 'a'.repeat(40))
  })

  test('processes multiple pending receipts', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x7777777777777777777777777777777777777777',
    })
    const port = await createTestPort(user.id)

    const txHash1 = '0x' + '111111'.repeat(11).slice(0, 64)
    const txHash2 = '0x' + '222222'.repeat(11).slice(0, 64)
    const txHash3 = '0x' + '333333'.repeat(11).slice(0, 64)

    const receipt1 = await Receipt.create({
      portId: port.id,
      txHash: txHash1,
      chainId: 5000,
      status: 'pending',
    })

    const receipt2 = await Receipt.create({
      portId: port.id,
      txHash: txHash2,
      chainId: 5000,
      status: 'pending',
    })

    const receipt3 = await Receipt.create({
      portId: port.id,
      txHash: txHash3,
      chainId: 5000,
      status: 'pending',
    })

    // Only receipt1 and receipt3 are indexed
    const mockService = new MockPonderService()
    mockService.addMockAnnouncement(txHash1, {
      id: 'ann-1',
      schemeId: '1',
      stealthAddress: '0x' + 's1'.repeat(20),
      caller: '0x' + 'p1'.repeat(20),
      ephemeralPubKey: '0x' + 'e1'.repeat(20),
      metadata: '0x',
      viewTag: 1,
      receiptHash: '0x' + 'h1'.repeat(20),
      blockNumber: '100',
      blockTimestamp: '1000',
      transactionHash: txHash1,
      logIndex: 0,
      chainId: 5000,
    })
    mockService.addMockAnnouncement(txHash3, {
      id: 'ann-3',
      schemeId: '1',
      stealthAddress: '0x' + 's3'.repeat(20),
      caller: '0x' + 'p3'.repeat(20),
      ephemeralPubKey: '0x' + 'e3'.repeat(20),
      metadata: '0x',
      viewTag: 3,
      receiptHash: '0x' + 'h3'.repeat(20),
      blockNumber: '300',
      blockTimestamp: '3000',
      transactionHash: txHash3,
      logIndex: 0,
      chainId: 5000,
    })

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt1.refresh()
    await receipt2.refresh()
    await receipt3.refresh()

    assert.equal(receipt1.status, 'confirmed')
    assert.equal(receipt2.status, 'pending') // Not indexed
    assert.equal(receipt3.status, 'confirmed')
  })

  test('respects batch size limit', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x8888888888888888888888888888888888888888',
    })
    const port = await createTestPort(user.id)

    // Create 5 pending receipts
    const receipts = []
    for (let i = 0; i < 5; i++) {
      const txHash = '0x' + `batch${i}`.repeat(11).slice(0, 64)
      const receipt = await Receipt.create({
        portId: port.id,
        txHash,
        chainId: 5000,
        status: 'pending',
      })
      receipts.push(receipt)
    }

    // Mock all as indexed
    const mockService = new MockPonderService()
    for (let i = 0; i < 5; i++) {
      const txHash = '0x' + `batch${i}`.repeat(11).slice(0, 64)
      mockService.addMockAnnouncement(txHash, {
        id: `ann-batch-${i}`,
        schemeId: '1',
        stealthAddress: '0x' + `s${i}`.repeat(20),
        caller: '0x' + `p${i}`.repeat(20),
        ephemeralPubKey: '0x' + `e${i}`.repeat(20),
        metadata: '0x',
        viewTag: i,
        receiptHash: '0x' + `h${i}`.repeat(20),
        blockNumber: String(i * 100),
        blockTimestamp: String(i * 1000),
        transactionHash: txHash,
        logIndex: 0,
        chainId: 5000,
      })
    }

    // Run with batch size of 2
    const job = new VerifyReceipts()
    await job.handle({ batchSize: 2, ponderService: mockService as never })

    // Refresh all
    for (const receipt of receipts) {
      await receipt.refresh()
    }

    // Only first 2 should be confirmed
    const confirmedCount = receipts.filter((r) => r.status === 'confirmed').length
    assert.equal(confirmedCount, 2)
  })

  // MAX ATTEMPTS TESTS

  test('marks receipt as failed after max verification attempts', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x9999999999999999999999999999999999999999',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'neverindexed'.repeat(6).slice(0, 64)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
      verificationAttempts: 9, // Already at 9 attempts
    })

    // Empty mock - receipt never found
    const mockService = new MockPonderService()

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt.refresh()
    assert.equal(receipt.status, 'failed')
    assert.equal(receipt.verificationAttempts, 10)
    assert.include(receipt.verificationError!, 'not found in indexer after maximum attempts')
  })

  test('increments verification attempts when not found', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'retrying'.repeat(8)

    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
      verificationAttempts: 3,
    })

    // Empty mock - not found
    const mockService = new MockPonderService()

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt.refresh()
    assert.equal(receipt.status, 'pending') // Still pending
    assert.equal(receipt.verificationAttempts, 4) // Incremented
    assert.isNull(receipt.verificationError) // No error yet
  })

  test('clears verification error on successful confirmation', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    })
    const port = await createTestPort(user.id)

    const txHash = '0x' + 'recovered'.repeat(8).slice(0, 64)

    // Create receipt that had previous attempts
    const receipt = await Receipt.create({
      portId: port.id,
      txHash,
      chainId: 5000,
      status: 'pending',
      verificationAttempts: 5,
    })

    const mockService = new MockPonderService()
    mockService.addMockAnnouncement(txHash, {
      id: 'recovered-ann',
      schemeId: '1',
      stealthAddress: '0x' + 'rec'.repeat(14).slice(0, 40),
      caller: '0x' + 'pay'.repeat(14).slice(0, 40),
      ephemeralPubKey: '0x' + 'eph'.repeat(22).slice(0, 64),
      metadata: '0x',
      viewTag: 128,
      receiptHash: '0x' + 'hash'.repeat(16),
      blockNumber: '77777',
      blockTimestamp: '7777777777',
      transactionHash: txHash,
      logIndex: 0,
      chainId: 5000,
    })

    const job = new VerifyReceipts()
    await job.handle({ ponderService: mockService as never })

    await receipt.refresh()
    assert.equal(receipt.status, 'confirmed')
    assert.isNull(receipt.verificationError) // Error cleared
  })
})
