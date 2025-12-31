import { test } from '@japa/runner'
import db from '@adonisjs/lucid/services/db'
import User from '#models/user'
import Port from '#models/port'
import VerifyPorts from '#jobs/verify_ports'
import type { PonderPort } from '#services/ponder_service'

// Mock PonderService for testing
class MockPonderService {
  private mockPorts: Map<string, PonderPort> = new Map()

  addMockPort(txHash: string, port: PonderPort) {
    this.mockPorts.set(txHash.toLowerCase(), port)
  }

  async findPortByTxHash(txHash: string, _chainId?: number): Promise<PonderPort | null> {
    return this.mockPorts.get(txHash.toLowerCase()) ?? null
  }
}

test.group('VerifyPorts Job', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  test('verifies pending port when found in indexer', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1111111111111111111111111111111111111111',
    })

    const txHash = '0x' + 'abc123'.repeat(11).slice(0, 64)
    const indexerPortId = '0x' + 'def456'.repeat(11).slice(0, 64)

    const port = await Port.create({
      userId: user.id,
      name: 'Pending Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'b'.repeat(64)),
      status: 'pending',
      txHash,
      chainId: 5000,
    })

    // Set up mock to return the indexed port
    const mockService = new MockPonderService()
    mockService.addMockPort(txHash, {
      id: indexerPortId,
      owner: user.walletAddress,
      name: 'Pending Port',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      active: true,
      blockNumber: '12345',
      blockTimestamp: '1234567890',
      transactionHash: txHash,
      chainId: 5000,
    })

    // Run the job
    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    // Verify the port was updated
    await port.refresh()
    assert.equal(port.status, 'confirmed')
    assert.equal(port.indexerPortId, indexerPortId)
  })

  test('leaves port as pending when not found in indexer', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x2222222222222222222222222222222222222222',
    })

    const txHash = '0x' + 'notfound'.repeat(8)

    const port = await Port.create({
      userId: user.id,
      name: 'Not Indexed Yet',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'c'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'd'.repeat(64)),
      status: 'pending',
      txHash,
      chainId: 5000,
    })

    // Empty mock - port not found in indexer
    const mockService = new MockPonderService()

    // Run the job
    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    // Verify the port is still pending
    await port.refresh()
    assert.equal(port.status, 'pending')
    assert.isNull(port.indexerPortId)
  })

  test('ignores ports without txHash', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x3333333333333333333333333333333333333333',
    })

    const port = await Port.create({
      userId: user.id,
      name: 'No TxHash Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'e'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'f'.repeat(64)),
      status: 'pending',
      txHash: null, // No transaction hash yet
      chainId: 5000,
    })

    const mockService = new MockPonderService()

    // Run the job
    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    // Port should still be pending (not processed)
    await port.refresh()
    assert.equal(port.status, 'pending')
    assert.isNull(port.indexerPortId)
  })

  test('ignores already confirmed ports', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x4444444444444444444444444444444444444444',
    })

    const txHash = '0x' + 'c'.repeat(64)
    const existingIndexerId = '0x' + 'e'.repeat(64)

    const port = await Port.create({
      userId: user.id,
      name: 'Already Confirmed',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + '1'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + '2'.repeat(64)),
      status: 'confirmed',
      txHash,
      indexerPortId: existingIndexerId,
      chainId: 5000,
    })

    // Mock would return a different ID if called
    const mockService = new MockPonderService()
    mockService.addMockPort(txHash, {
      id: '0x' + 'd'.repeat(64),
      owner: user.walletAddress,
      name: 'Already Confirmed',
      stealthMetaAddress: 'st:mnt:0x' + '1'.repeat(132),
      active: true,
      blockNumber: '99999',
      blockTimestamp: '9999999999',
      transactionHash: txHash,
      chainId: 5000,
    })

    // Run the job
    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    // Port should remain unchanged
    await port.refresh()
    assert.equal(port.status, 'confirmed')
    assert.equal(port.indexerPortId, existingIndexerId)
  })

  test('processes multiple pending ports', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x5555555555555555555555555555555555555555',
    })

    const txHash1 = '0x' + '111111'.repeat(11).slice(0, 64)
    const txHash2 = '0x' + '222222'.repeat(11).slice(0, 64)
    const txHash3 = '0x' + '333333'.repeat(11).slice(0, 64)

    const port1 = await Port.create({
      userId: user.id,
      name: 'Port 1',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + '3'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + '4'.repeat(64)),
      status: 'pending',
      txHash: txHash1,
      chainId: 5000,
    })

    const port2 = await Port.create({
      userId: user.id,
      name: 'Port 2',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + '5'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + '6'.repeat(64)),
      status: 'pending',
      txHash: txHash2,
      chainId: 5000,
    })

    const port3 = await Port.create({
      userId: user.id,
      name: 'Port 3',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + '7'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + '8'.repeat(64)),
      status: 'pending',
      txHash: txHash3,
      chainId: 5000,
    })

    // Only port1 and port3 are indexed
    const mockService = new MockPonderService()
    mockService.addMockPort(txHash1, {
      id: '0x' + 'indexed1'.repeat(8),
      owner: user.walletAddress,
      name: 'Port 1',
      stealthMetaAddress: 'st:mnt:0x' + '3'.repeat(132),
      active: true,
      blockNumber: '100',
      blockTimestamp: '1000000',
      transactionHash: txHash1,
      chainId: 5000,
    })
    mockService.addMockPort(txHash3, {
      id: '0x' + 'indexed3'.repeat(8),
      owner: user.walletAddress,
      name: 'Port 3',
      stealthMetaAddress: 'st:mnt:0x' + '7'.repeat(132),
      active: true,
      blockNumber: '300',
      blockTimestamp: '3000000',
      transactionHash: txHash3,
      chainId: 5000,
    })

    // Run the job
    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    // Port 1 and 3 should be confirmed, port 2 should still be pending
    await port1.refresh()
    await port2.refresh()
    await port3.refresh()

    assert.equal(port1.status, 'confirmed')
    assert.equal(port1.indexerPortId, '0x' + 'indexed1'.repeat(8))

    assert.equal(port2.status, 'pending')
    assert.isNull(port2.indexerPortId)

    assert.equal(port3.status, 'confirmed')
    assert.equal(port3.indexerPortId, '0x' + 'indexed3'.repeat(8))
  })

  test('respects batch size limit', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x6666666666666666666666666666666666666666',
    })

    // Create 5 pending ports
    const ports = []
    for (let i = 0; i < 5; i++) {
      const txHash = '0x' + `batch${i}`.repeat(11).slice(0, 64)
      const port = await Port.create({
        userId: user.id,
        name: `Batch Port ${i}`,
        type: 'permanent',
        stealthMetaAddress: `st:mnt:0x${i.toString().repeat(132).slice(0, 132)}`,
        viewingKeyEncrypted: Port.encryptViewingKey('0x' + `${i}`.repeat(64)),
        status: 'pending',
        txHash,
        chainId: 5000,
      })
      ports.push(port)
    }

    // Mock all ports as indexed
    const mockService = new MockPonderService()
    for (let i = 0; i < 5; i++) {
      const txHash = '0x' + `batch${i}`.repeat(11).slice(0, 64)
      mockService.addMockPort(txHash, {
        id: '0x' + `batchid${i}`.repeat(8),
        owner: user.walletAddress,
        name: `Batch Port ${i}`,
        stealthMetaAddress: `st:mnt:0x${i.toString().repeat(132).slice(0, 132)}`,
        active: true,
        blockNumber: String(i * 100),
        blockTimestamp: String(i * 1000000),
        transactionHash: txHash,
        chainId: 5000,
      })
    }

    // Run job with batch size of 2
    const job = new VerifyPorts()
    await job.handle({ batchSize: 2, ponderService: mockService as never })

    // Refresh all ports
    for (const port of ports) {
      await port.refresh()
    }

    // Only first 2 should be confirmed (batch limit)
    const confirmedCount = ports.filter((p) => p.status === 'confirmed').length
    assert.equal(confirmedCount, 2)
  })

  // SECURITY TESTS

  test('rejects port when indexed owner does not match user wallet', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1111111111111111111111111111111111111111',
    })

    const txHash = '0x' + 'hijack'.repeat(11).slice(0, 64)

    const port = await Port.create({
      userId: user.id,
      name: 'Hijacked Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'b'.repeat(64)),
      status: 'pending',
      txHash,
      chainId: 5000,
    })

    // Mock returns port owned by DIFFERENT wallet (attacker submitted someone else's tx)
    const mockService = new MockPonderService()
    mockService.addMockPort(txHash, {
      id: '0x' + 'attackerid'.repeat(7).slice(0, 64),
      owner: '0x9999999999999999999999999999999999999999', // Different owner!
      name: 'Hijacked Port',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      active: true,
      blockNumber: '12345',
      blockTimestamp: '1234567890',
      transactionHash: txHash,
      chainId: 5000,
    })

    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    await port.refresh()
    assert.equal(port.status, 'failed')
    assert.isNotNull(port.verificationError)
    assert.include(port.verificationError!, 'Ownership mismatch')
  })

  test('rejects port when stealthMetaAddress does not match indexed', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x2222222222222222222222222222222222222222',
    })

    const txHash = '0x' + 'stealthmismatch'.repeat(5).slice(0, 64)

    const port = await Port.create({
      userId: user.id,
      name: 'Wrong Stealth Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'b'.repeat(64)),
      status: 'pending',
      txHash,
      chainId: 5000,
    })

    // Mock returns port with DIFFERENT stealthMetaAddress
    const mockService = new MockPonderService()
    mockService.addMockPort(txHash, {
      id: '0x' + 'portid'.repeat(11).slice(0, 64),
      owner: user.walletAddress,
      name: 'Wrong Stealth Port',
      stealthMetaAddress: 'st:mnt:0x' + 'z'.repeat(132), // Different stealth meta!
      active: true,
      blockNumber: '12345',
      blockTimestamp: '1234567890',
      transactionHash: txHash,
      chainId: 5000,
    })

    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    await port.refresh()
    assert.equal(port.status, 'failed')
    assert.isNotNull(port.verificationError)
    assert.include(port.verificationError!, 'Stealth meta address mismatch')
  })

  test('marks port as failed after max verification attempts', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x7777777777777777777777777777777777777777',
    })

    const txHash = '0x' + 'neverindexed'.repeat(6).slice(0, 64)

    const port = await Port.create({
      userId: user.id,
      name: 'Never Indexed Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'n'.repeat(132),
      viewingKeyEncrypted: Port.encryptViewingKey('0x' + 'm'.repeat(64)),
      status: 'pending',
      txHash,
      chainId: 5000,
      verificationAttempts: 9, // Already at 9 attempts
    })

    // Empty mock - port never found
    const mockService = new MockPonderService()

    const job = new VerifyPorts()
    await job.handle({ ponderService: mockService as never })

    await port.refresh()
    assert.equal(port.status, 'failed')
    assert.equal(port.verificationAttempts, 10)
    assert.include(port.verificationError!, 'not found in indexer after maximum attempts')
  })
})
