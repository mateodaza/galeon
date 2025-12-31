import { test } from '@japa/runner'
import Port from '#models/port'

test.group('Port Model', () => {
  test('has correct table name', async ({ assert }) => {
    assert.equal(Port.table, 'ports')
  })

  test('has correct primary key', async ({ assert }) => {
    assert.equal(Port.primaryKey, 'id')
  })

  test('defines all required columns', async ({ assert }) => {
    const columns = Port.$columnsDefinitions
    assert.isTrue(columns.has('id'))
    assert.isTrue(columns.has('userId'))
    assert.isTrue(columns.has('indexerPortId'))
    assert.isTrue(columns.has('name'))
    assert.isTrue(columns.has('type'))
    assert.isTrue(columns.has('stealthMetaAddress'))
    assert.isTrue(columns.has('viewingKeyEncrypted'))
    assert.isTrue(columns.has('chainId'))
    assert.isTrue(columns.has('active'))
    assert.isTrue(columns.has('archived'))
    assert.isTrue(columns.has('totalReceived'))
    assert.isTrue(columns.has('totalCollected'))
    assert.isTrue(columns.has('paymentCount'))
    assert.isTrue(columns.has('archivedAt'))
    assert.isTrue(columns.has('createdAt'))
    assert.isTrue(columns.has('updatedAt'))
  })

  test('has user relationship', async ({ assert }) => {
    const relations = Port.$relationsDefinitions
    assert.isTrue(relations.has('user'))
    assert.equal(relations.get('user')?.type, 'belongsTo')
  })

  test('has receipts relationship', async ({ assert }) => {
    const relations = Port.$relationsDefinitions
    assert.isTrue(relations.has('receipts'))
    assert.equal(relations.get('receipts')?.type, 'hasMany')
  })

  test('type field accepts valid port types', async ({ assert }) => {
    const port = new Port()

    port.type = 'permanent'
    assert.equal(port.type, 'permanent')

    port.type = 'recurring'
    assert.equal(port.type, 'recurring')

    port.type = 'one-time'
    assert.equal(port.type, 'one-time')

    port.type = 'burner'
    assert.equal(port.type, 'burner')
  })

  test('bigint fields are stored as strings', async ({ assert }) => {
    const port = new Port()
    port.totalReceived = '1000000000000000000' // 1 ETH in wei
    port.totalCollected = '500000000000000000' // 0.5 ETH in wei

    assert.isString(port.totalReceived)
    assert.isString(port.totalCollected)
    assert.equal(port.totalReceived, '1000000000000000000')
  })
})
