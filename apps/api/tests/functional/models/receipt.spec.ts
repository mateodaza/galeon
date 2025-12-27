import { test } from '@japa/runner'
import User from '#models/user'
import Port from '#models/port'
import Receipt from '#models/receipt'
import db from '@adonisjs/lucid/services/db'

test.group('Receipt Model - Database', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  async function createUserAndPort() {
    const user = await User.create({
      walletAddress: '0x' + Math.random().toString(16).slice(2, 42).padEnd(40, '0'),
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + Math.random().toString(16).slice(2).padEnd(64, '0'),
      name: 'Test Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'a'.repeat(132),
      viewingKeyEncrypted: 'encrypted_key',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    return { user, port }
  }

  test('can create a receipt', async ({ assert }) => {
    const { port } = await createUserAndPort()

    const receipt = await Receipt.create({
      portId: port.id,
      receiptHash: '0x' + 'abc123'.repeat(10).slice(0, 64),
      stealthAddress: '0x' + 'def456'.repeat(6).slice(0, 40),
      ephemeralPubKey: '0x04' + 'abcdef'.repeat(21).slice(0, 128),
      viewTag: 42,
      payerAddress: '0x' + '789012'.repeat(6).slice(0, 40),
      amount: '1000000000000000000',
      currency: 'MNT',
      tokenAddress: null,
      memo: 'Test payment',
      txHash: '0x' + 'fedcba'.repeat(10).slice(0, 64),
      blockNumber: '12345678',
      chainId: 5003,
      status: 'confirmed',
    })

    assert.exists(receipt.id)
    assert.equal(receipt.portId, port.id)
    assert.equal(receipt.viewTag, 42)
    assert.equal(receipt.amount, '1000000000000000000')
    assert.equal(receipt.status, 'confirmed')
  })

  test('receipt belongs to port relationship', async ({ assert }) => {
    const { port } = await createUserAndPort()

    const receipt = await Receipt.create({
      portId: port.id,
      receiptHash: '0x' + '111'.repeat(21).slice(0, 64),
      stealthAddress: '0x' + '222'.repeat(13).slice(0, 40),
      ephemeralPubKey: '0x04' + '333'.repeat(42).slice(0, 128),
      viewTag: 100,
      payerAddress: '0x' + '444'.repeat(13).slice(0, 40),
      amount: '500000000000000000',
      currency: 'MNT',
      tokenAddress: null,
      memo: null,
      txHash: '0x' + '555'.repeat(21).slice(0, 64),
      blockNumber: '12345679',
      chainId: 5003,
      status: 'pending',
    })

    await receipt.load('port')

    assert.equal(receipt.port.id, port.id)
    assert.equal(receipt.port.name, 'Test Port')
  })

  test('port has many receipts relationship', async ({ assert }) => {
    const { port } = await createUserAndPort()

    await Receipt.createMany([
      {
        portId: port.id,
        receiptHash: '0x' + 'a1'.repeat(32),
        stealthAddress: '0x' + 'b1'.repeat(20),
        ephemeralPubKey: '0x04' + 'c1'.repeat(64),
        viewTag: 1,
        payerAddress: '0x' + 'd1'.repeat(20),
        amount: '100',
        currency: 'MNT',
        tokenAddress: null,
        memo: null,
        txHash: '0x' + 'e1'.repeat(32),
        blockNumber: '1',
        chainId: 5003,
        status: 'confirmed',
      },
      {
        portId: port.id,
        receiptHash: '0x' + 'a2'.repeat(32),
        stealthAddress: '0x' + 'b2'.repeat(20),
        ephemeralPubKey: '0x04' + 'c2'.repeat(64),
        viewTag: 2,
        payerAddress: '0x' + 'd2'.repeat(20),
        amount: '200',
        currency: 'MNT',
        tokenAddress: null,
        memo: null,
        txHash: '0x' + 'e2'.repeat(32),
        blockNumber: '2',
        chainId: 5003,
        status: 'confirmed',
      },
    ])

    await port.load('receipts')

    assert.lengthOf(port.receipts, 2)
  })

  test('receipt_hash must be unique', async ({ assert }) => {
    const { port } = await createUserAndPort()
    const receiptHash = '0x' + 'unique'.repeat(10).slice(0, 64)

    await Receipt.create({
      portId: port.id,
      receiptHash,
      stealthAddress: '0x' + 'aaa'.repeat(13).slice(0, 40),
      ephemeralPubKey: '0x04' + 'bbb'.repeat(42).slice(0, 128),
      viewTag: 10,
      payerAddress: '0x' + 'ccc'.repeat(13).slice(0, 40),
      amount: '100',
      currency: 'MNT',
      tokenAddress: null,
      memo: null,
      txHash: '0x' + 'ddd'.repeat(21).slice(0, 64),
      blockNumber: '100',
      chainId: 5003,
      status: 'confirmed',
    })

    try {
      await Receipt.create({
        portId: port.id,
        receiptHash,
        stealthAddress: '0x' + 'eee'.repeat(13).slice(0, 40),
        ephemeralPubKey: '0x04' + 'fff'.repeat(42).slice(0, 128),
        viewTag: 20,
        payerAddress: '0x' + '000'.repeat(13).slice(0, 40),
        amount: '200',
        currency: 'MNT',
        tokenAddress: null,
        memo: null,
        txHash: '0x' + '111'.repeat(21).slice(0, 64),
        blockNumber: '101',
        chainId: 5003,
        status: 'confirmed',
      })
      assert.fail('Should have thrown unique constraint error')
    } catch (error) {
      assert.include((error as Error).message, 'unique')
    }
  })

  test('viewTag accepts 0-255 range', async ({ assert }) => {
    const { port } = await createUserAndPort()

    const receipt0 = await Receipt.create({
      portId: port.id,
      receiptHash: '0x' + 'vt0'.repeat(21).slice(0, 64),
      stealthAddress: '0x' + 'st0'.repeat(13).slice(0, 40),
      ephemeralPubKey: '0x04' + 'ep0'.repeat(42).slice(0, 128),
      viewTag: 0,
      payerAddress: '0x' + 'pa0'.repeat(13).slice(0, 40),
      amount: '100',
      currency: 'MNT',
      tokenAddress: null,
      memo: null,
      txHash: '0x' + 'tx0'.repeat(21).slice(0, 64),
      blockNumber: '1',
      chainId: 5003,
      status: 'confirmed',
    })

    const receipt255 = await Receipt.create({
      portId: port.id,
      receiptHash: '0x' + 'vt255'.repeat(12).slice(0, 64),
      stealthAddress: '0x' + 'st255'.repeat(8).slice(0, 40),
      ephemeralPubKey: '0x04' + 'ep255'.repeat(25).slice(0, 128),
      viewTag: 255,
      payerAddress: '0x' + 'pa255'.repeat(8).slice(0, 40),
      amount: '100',
      currency: 'MNT',
      tokenAddress: null,
      memo: null,
      txHash: '0x' + 'tx255'.repeat(12).slice(0, 64),
      blockNumber: '2',
      chainId: 5003,
      status: 'confirmed',
    })

    assert.equal(receipt0.viewTag, 0)
    assert.equal(receipt255.viewTag, 255)
  })

  test('can update receipt status to collected', async ({ assert }) => {
    const { port } = await createUserAndPort()

    const receipt = await Receipt.create({
      portId: port.id,
      receiptHash: '0x' + 'collect'.repeat(9).slice(0, 64),
      stealthAddress: '0x' + 'stcoll'.repeat(6).slice(0, 40),
      ephemeralPubKey: '0x04' + 'epcoll'.repeat(21).slice(0, 128),
      viewTag: 50,
      payerAddress: '0x' + 'pacoll'.repeat(6).slice(0, 40),
      amount: '1000000000000000000',
      currency: 'MNT',
      tokenAddress: null,
      memo: null,
      txHash: '0x' + 'txcoll'.repeat(10).slice(0, 64),
      blockNumber: '12345',
      chainId: 5003,
      status: 'confirmed',
    })

    receipt.status = 'collected'
    await receipt.save()

    const refreshed = await Receipt.find(receipt.id)
    assert.equal(refreshed?.status, 'collected')
  })

  test('can store token payments', async ({ assert }) => {
    const { port } = await createUserAndPort()

    const receipt = await Receipt.create({
      portId: port.id,
      receiptHash: '0x' + 'token'.repeat(12).slice(0, 64),
      stealthAddress: '0x' + 'sttoken'.repeat(5).slice(0, 40),
      ephemeralPubKey: '0x04' + 'eptoken'.repeat(18).slice(0, 128),
      viewTag: 75,
      payerAddress: '0x' + 'patoken'.repeat(5).slice(0, 40),
      amount: '5000000', // USDC has 6 decimals
      currency: 'USDC',
      tokenAddress: '0x' + 'usdc'.repeat(10).slice(0, 40),
      memo: 'USDC payment',
      txHash: '0x' + 'txtoken'.repeat(9).slice(0, 64),
      blockNumber: '12346',
      chainId: 5003,
      status: 'confirmed',
    })

    assert.equal(receipt.currency, 'USDC')
    assert.isNotNull(receipt.tokenAddress)
    assert.equal(receipt.amount, '5000000')
  })
})
