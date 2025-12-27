import { test } from '@japa/runner'
import Collection from '#models/collection'

test.group('Collection Model', () => {
  test('has correct table name', async ({ assert }) => {
    assert.equal(Collection.table, 'collections')
  })

  test('has correct primary key', async ({ assert }) => {
    assert.equal(Collection.primaryKey, 'id')
  })

  test('defines all required columns', async ({ assert }) => {
    const columns = Collection.$columnsDefinitions
    assert.isTrue(columns.has('id'))
    assert.isTrue(columns.has('userId'))
    assert.isTrue(columns.has('recipientWallet'))
    assert.isTrue(columns.has('status'))
    assert.isTrue(columns.has('totalReceipts'))
    assert.isTrue(columns.has('processedReceipts'))
    assert.isTrue(columns.has('totalAmount'))
    assert.isTrue(columns.has('tokenAmounts'))
    assert.isTrue(columns.has('txHash'))
    assert.isTrue(columns.has('errorMessage'))
    assert.isTrue(columns.has('completedAt'))
    assert.isTrue(columns.has('createdAt'))
    assert.isTrue(columns.has('updatedAt'))
  })

  test('has user relationship', async ({ assert }) => {
    const relations = Collection.$relationsDefinitions
    assert.isTrue(relations.has('user'))
    assert.equal(relations.get('user')?.type, 'belongsTo')
  })

  test('has receipts relationship', async ({ assert }) => {
    const relations = Collection.$relationsDefinitions
    assert.isTrue(relations.has('receipts'))
    assert.equal(relations.get('receipts')?.type, 'hasMany')
  })

  test('status field accepts valid statuses', async ({ assert }) => {
    const collection = new Collection()

    collection.status = 'pending'
    assert.equal(collection.status, 'pending')

    collection.status = 'processing'
    assert.equal(collection.status, 'processing')

    collection.status = 'completed'
    assert.equal(collection.status, 'completed')

    collection.status = 'failed'
    assert.equal(collection.status, 'failed')
  })

  test('tokenAmounts stores object with string values', async ({ assert }) => {
    const collection = new Collection()
    collection.tokenAmounts = {
      '0x0000000000000000000000000000000000000000': '1000000000000000000',
      '0xUSDC': '5000000',
    }

    assert.isObject(collection.tokenAmounts)
    assert.equal(
      collection.tokenAmounts['0x0000000000000000000000000000000000000000'],
      '1000000000000000000'
    )
    assert.equal(collection.tokenAmounts['0xUSDC'], '5000000')
  })

  test('totalAmount is stored as string for bigint', async ({ assert }) => {
    const collection = new Collection()
    collection.totalAmount = '2500000000000000000' // 2.5 ETH in wei

    assert.isString(collection.totalAmount)
    assert.equal(collection.totalAmount, '2500000000000000000')
  })

  test('nullable fields can be null', async ({ assert }) => {
    const collection = new Collection()
    collection.txHash = null
    collection.errorMessage = null

    assert.isNull(collection.txHash)
    assert.isNull(collection.errorMessage)
  })

  test('receipt counts are numbers', async ({ assert }) => {
    const collection = new Collection()
    collection.totalReceipts = 10
    collection.processedReceipts = 5

    assert.isNumber(collection.totalReceipts)
    assert.isNumber(collection.processedReceipts)
    assert.equal(collection.totalReceipts, 10)
    assert.equal(collection.processedReceipts, 5)
  })
})
