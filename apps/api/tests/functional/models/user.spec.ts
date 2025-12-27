import { test } from '@japa/runner'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'

test.group('User Model - Database', (group) => {
  // Use database transaction for each test to isolate data
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return () => db.rollbackGlobalTransaction()
  })

  test('can create a user with wallet address', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1234567890123456789012345678901234567890',
    })

    assert.exists(user.id)
    assert.equal(user.walletAddress, '0x1234567890123456789012345678901234567890')
    assert.exists(user.createdAt)
    assert.exists(user.updatedAt)
  })

  test('wallet address is unique', async ({ assert }) => {
    const walletAddress = '0xabcdef1234567890abcdef1234567890abcdef12'

    await User.create({ walletAddress })

    try {
      await User.create({ walletAddress })
      assert.fail('Should have thrown unique constraint error')
    } catch (error) {
      assert.include((error as Error).message, 'unique')
    }
  })

  test('can find user by wallet address', async ({ assert }) => {
    const walletAddress = '0x9876543210987654321098765432109876543210'
    await User.create({ walletAddress })

    const found = await User.findBy('walletAddress', walletAddress)

    assert.isNotNull(found)
    assert.equal(found?.walletAddress, walletAddress)
  })

  test('can update user', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x1111111111111111111111111111111111111111',
    })

    const originalUpdatedAt = user.updatedAt

    // Small delay to ensure updatedAt changes
    await new Promise((resolve) => setTimeout(resolve, 10))

    user.walletAddress = '0x2222222222222222222222222222222222222222'
    await user.save()

    assert.equal(user.walletAddress, '0x2222222222222222222222222222222222222222')
    assert.notEqual(user.updatedAt.toISO(), originalUpdatedAt.toISO())
  })

  test('can delete user', async ({ assert }) => {
    const user = await User.create({
      walletAddress: '0x3333333333333333333333333333333333333333',
    })
    const userId = user.id

    await user.delete()

    const found = await User.find(userId)
    assert.isNull(found)
  })

  test('can query multiple users', async ({ assert }) => {
    await User.createMany([
      { walletAddress: '0x4444444444444444444444444444444444444444' },
      { walletAddress: '0x5555555555555555555555555555555555555555' },
      { walletAddress: '0x6666666666666666666666666666666666666666' },
    ])

    const users = await User.all()

    assert.lengthOf(users, 3)
  })
})
