import { test } from '@japa/runner'
import User from '#models/user'
import Port from '#models/port'
import db from '@adonisjs/lucid/services/db'

test.group('Port Model - Database', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  test('can create a port for a user', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1234567890123456789012345678901234567890',
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + 'a'.repeat(64),
      name: 'My Payment Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'b'.repeat(132),
      viewingKeyEncrypted: 'encrypted_viewing_key_data',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    assert.exists(port.id)
    assert.equal(port.userId, user.id)
    assert.equal(port.name, 'My Payment Port')
    assert.equal(port.type, 'permanent')
    assert.isTrue(port.active)
    assert.isFalse(port.archived)
  })

  test('port belongs to user relationship', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1111111111111111111111111111111111111111',
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + 'c'.repeat(64),
      name: 'Test Port',
      type: 'recurring',
      stealthMetaAddress: 'st:mnt:0x' + 'd'.repeat(132),
      viewingKeyEncrypted: 'encrypted_key',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    await port.load('user')

    assert.equal(port.user.id, user.id)
    assert.equal(port.user.walletAddress, '0x1111111111111111111111111111111111111111')
  })

  test('user has many ports relationship', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x2222222222222222222222222222222222222222',
    })

    await Port.createMany([
      {
        userId: user.id,
        portId: '0x' + 'e'.repeat(64),
        name: 'Port 1',
        type: 'permanent',
        stealthMetaAddress: 'st:mnt:0x' + 'f'.repeat(132),
        viewingKeyEncrypted: 'key1',
        active: true,
        archived: false,
        totalReceived: '0',
        totalCollected: '0',
        paymentCount: 0,
      },
      {
        userId: user.id,
        portId: '0x' + '1'.repeat(64),
        name: 'Port 2',
        type: 'one-time',
        stealthMetaAddress: 'st:mnt:0x' + '2'.repeat(132),
        viewingKeyEncrypted: 'key2',
        active: true,
        archived: false,
        totalReceived: '0',
        totalCollected: '0',
        paymentCount: 0,
      },
    ])

    await user.load('ports')

    assert.lengthOf(user.ports, 2)
  })

  test('port_id must be unique', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x3333333333333333333333333333333333333333',
    })

    const portId = '0x' + '3'.repeat(64)

    await Port.create({
      userId: user.id,
      portId,
      name: 'First Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + '4'.repeat(132),
      viewingKeyEncrypted: 'key1',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    try {
      await Port.create({
        userId: user.id,
        portId,
        name: 'Duplicate Port',
        type: 'permanent',
        stealthMetaAddress: 'st:mnt:0x' + '5'.repeat(132),
        viewingKeyEncrypted: 'key2',
        active: true,
        archived: false,
        totalReceived: '0',
        totalCollected: '0',
        paymentCount: 0,
      })
      assert.fail('Should have thrown unique constraint error')
    } catch (error) {
      assert.include((error as Error).message, 'unique')
    }
  })

  test('can update port stats', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x4444444444444444444444444444444444444444',
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + '6'.repeat(64),
      name: 'Stats Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + '7'.repeat(132),
      viewingKeyEncrypted: 'key',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    // Simulate receiving a payment
    port.totalReceived = '1000000000000000000' // 1 ETH in wei
    port.paymentCount = 1
    await port.save()

    const refreshed = await Port.find(port.id)
    assert.equal(refreshed?.totalReceived, '1000000000000000000')
    assert.equal(refreshed?.paymentCount, 1)
  })

  test('can archive a port', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x5555555555555555555555555555555555555555',
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + '8'.repeat(64),
      name: 'Archive Port',
      type: 'burner',
      stealthMetaAddress: 'st:mnt:0x' + '9'.repeat(132),
      viewingKeyEncrypted: 'key',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    port.archived = true
    port.active = false
    await port.save()

    const refreshed = await Port.find(port.id)
    assert.isTrue(refreshed?.archived)
    assert.isFalse(refreshed?.active)
  })

  test('deleting user cascades to ports', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x6666666666666666666666666666666666666666',
    })

    const port = await Port.create({
      userId: user.id,
      portId: '0x' + 'a1'.repeat(32),
      name: 'Cascade Port',
      type: 'permanent',
      stealthMetaAddress: 'st:mnt:0x' + 'b1'.repeat(66),
      viewingKeyEncrypted: 'key',
      active: true,
      archived: false,
      totalReceived: '0',
      totalCollected: '0',
      paymentCount: 0,
    })

    const portId = port.id
    await user.delete()

    const foundPort = await Port.find(portId)
    assert.isNull(foundPort)
  })
})
