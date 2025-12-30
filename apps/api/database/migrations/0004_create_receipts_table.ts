import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'receipts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      // port_id is nullable for fog payments (which don't have a port)
      table.uuid('port_id').nullable().references('id').inTable('ports').onDelete('CASCADE')
      // user_id for fog payments that don't have a port
      table
        .integer('user_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .uuid('collection_id')
        .nullable()
        .references('id')
        .inTable('collections')
        .onDelete('SET NULL')
      // fog_payment_id links to scheduled fog payment if applicable
      table.uuid('fog_payment_id').nullable()
      table.boolean('is_fog_payment').notNullable().defaultTo(false)
      table.string('receipt_hash', 66).notNullable().unique() // bytes32 hex
      table.string('stealth_address', 42).notNullable()
      table.text('ephemeral_pub_key').notNullable() // hex-encoded, needed to derive stealth private key for collection
      table.smallint('view_tag').notNullable() // 0-255, fast scan optimization
      table.string('payer_address', 42).notNullable()
      table.decimal('amount', 78, 0).notNullable() // wei
      table.string('currency', 10).notNullable() // MNT, ETH, USDC, etc.
      table.string('token_address', 42).nullable() // null for native
      table.text('memo').nullable()
      table.string('tx_hash', 66).notNullable()
      table.bigInteger('block_number').notNullable()
      table.integer('chain_id').notNullable()
      table.enum('status', ['pending', 'confirmed', 'collected']).notNullable().defaultTo('pending')
      table.timestamp('collected_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['port_id', 'status'])
      table.index(['user_id', 'is_fog_payment'])
      table.index(['collection_id'])
      table.index(['stealth_address'])
      table.index(['tx_hash'])
      table.index(['fog_payment_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
