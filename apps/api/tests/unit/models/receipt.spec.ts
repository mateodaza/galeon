import { test } from '@japa/runner'
import Receipt from '#models/receipt'

test.group('Receipt Model', () => {
  test('has correct table name', async ({ assert }) => {
    assert.equal(Receipt.table, 'receipts')
  })

  test('has correct primary key', async ({ assert }) => {
    assert.equal(Receipt.primaryKey, 'id')
  })

  test('defines all required columns', async ({ assert }) => {
    const columns = Receipt.$columnsDefinitions
    assert.isTrue(columns.has('id'))
    assert.isTrue(columns.has('portId'))
    assert.isTrue(columns.has('collectionId'))
    assert.isTrue(columns.has('receiptHash'))
    assert.isTrue(columns.has('stealthAddress'))
    assert.isTrue(columns.has('ephemeralPubKey'))
    assert.isTrue(columns.has('viewTag'))
    assert.isTrue(columns.has('payerAddress'))
    assert.isTrue(columns.has('amount'))
    assert.isTrue(columns.has('currency'))
    assert.isTrue(columns.has('tokenAddress'))
    assert.isTrue(columns.has('memo'))
    assert.isTrue(columns.has('txHash'))
    assert.isTrue(columns.has('blockNumber'))
    assert.isTrue(columns.has('chainId'))
    assert.isTrue(columns.has('status'))
    assert.isTrue(columns.has('collectedAt'))
    assert.isTrue(columns.has('createdAt'))
    assert.isTrue(columns.has('updatedAt'))
  })

  test('has port relationship', async ({ assert }) => {
    const relations = Receipt.$relationsDefinitions
    assert.isTrue(relations.has('port'))
    assert.equal(relations.get('port')?.type, 'belongsTo')
  })

  test('has collection relationship', async ({ assert }) => {
    const relations = Receipt.$relationsDefinitions
    assert.isTrue(relations.has('collection'))
    assert.equal(relations.get('collection')?.type, 'belongsTo')
  })

  test('status field accepts valid statuses', async ({ assert }) => {
    const receipt = new Receipt()

    receipt.status = 'pending'
    assert.equal(receipt.status, 'pending')

    receipt.status = 'confirmed'
    assert.equal(receipt.status, 'confirmed')

    receipt.status = 'collected'
    assert.equal(receipt.status, 'collected')
  })

  test('ephemeralPubKey is stored as string', async ({ assert }) => {
    const receipt = new Receipt()
    const pubKey =
      '0x04abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    receipt.ephemeralPubKey = pubKey
    assert.isString(receipt.ephemeralPubKey)
    assert.equal(receipt.ephemeralPubKey, pubKey)
  })

  test('viewTag is stored as number (0-255)', async ({ assert }) => {
    const receipt = new Receipt()
    receipt.viewTag = 0
    assert.equal(receipt.viewTag, 0)

    receipt.viewTag = 255
    assert.equal(receipt.viewTag, 255)

    receipt.viewTag = 128
    assert.equal(receipt.viewTag, 128)
  })

  test('amount and blockNumber are stored as strings for bigint', async ({ assert }) => {
    const receipt = new Receipt()
    receipt.amount = '1000000000000000000' // 1 ETH in wei
    receipt.blockNumber = '12345678'

    assert.isString(receipt.amount)
    assert.isString(receipt.blockNumber)
  })

  test('nullable fields can be null', async ({ assert }) => {
    const receipt = new Receipt()
    receipt.collectionId = null
    receipt.tokenAddress = null
    receipt.memo = null

    assert.isNull(receipt.collectionId)
    assert.isNull(receipt.tokenAddress)
    assert.isNull(receipt.memo)
  })
})
