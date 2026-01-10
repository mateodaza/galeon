import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sent_payments'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('tx_hash', 66).notNullable()
      table.integer('chain_id').notNullable()
      table.string('recipient_address', 42).notNullable() // Stealth address
      table.string('recipient_port_name', 255).nullable() // Port name if known
      table.string('amount', 78).notNullable() // uint256 max length
      table.string('currency', 10).notNullable() // MNT, ETH, USDC, etc.
      table.string('token_address', 42).nullable() // null for native token
      table.string('source', 10).notNullable() // wallet, port, pool
      table.text('memo').nullable()
      table.string('status', 20).notNullable().defaultTo('pending')
      table.string('block_number', 78).nullable()
      table.integer('verification_attempts').notNullable().defaultTo(0)
      table.text('verification_error').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()

      // Indexes
      table.index(['user_id', 'created_at'])
      table.index(['tx_hash', 'chain_id'])
      table.index('status')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
