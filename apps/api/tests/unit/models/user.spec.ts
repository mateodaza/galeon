import { test } from '@japa/runner'
import User from '#models/user'

test.group('User Model', () => {
  test('has correct table name', async ({ assert }) => {
    assert.equal(User.table, 'users')
  })

  test('has correct primary key', async ({ assert }) => {
    assert.equal(User.primaryKey, 'id')
  })

  test('defines walletAddress column', async ({ assert }) => {
    const user = new User()
    user.walletAddress = '0x1234567890123456789012345678901234567890'
    assert.equal(user.walletAddress, '0x1234567890123456789012345678901234567890')
  })

  test('has timestamps', async ({ assert }) => {
    const columns = User.$columnsDefinitions
    assert.isTrue(columns.has('createdAt'))
    assert.isTrue(columns.has('updatedAt'))
  })

  test('has ports relationship', async ({ assert }) => {
    const relations = User.$relationsDefinitions
    assert.isTrue(relations.has('ports'))
    assert.equal(relations.get('ports')?.type, 'hasMany')
  })

  test('has collections relationship', async ({ assert }) => {
    const relations = User.$relationsDefinitions
    assert.isTrue(relations.has('collections'))
    assert.equal(relations.get('collections')?.type, 'hasMany')
  })

  test('has receipts relationship', async ({ assert }) => {
    const relations = User.$relationsDefinitions
    assert.isTrue(relations.has('receipts'))
    assert.equal(relations.get('receipts')?.type, 'hasMany')
  })
})
