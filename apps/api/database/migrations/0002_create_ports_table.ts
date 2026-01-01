import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'ports'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.db.rawQuery('gen_random_uuid()').knexQuery)
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table.string('indexer_port_id', 66).nullable().unique() // bytes32 hex - links to Ponder indexer
      table.string('name', 255).notNullable()
      table
        .enum('type', ['permanent', 'recurring', 'one-time', 'burner'])
        .notNullable()
        .defaultTo('permanent')
      table.text('stealth_meta_address').nullable() // Nullable for two-step creation flow
      table.text('viewing_key_encrypted').nullable() // Encrypted with APP_KEY, nullable for two-step flow
      table.integer('chain_id').notNullable().defaultTo(5000) // Mantle Mainnet
      table.enum('status', ['pending', 'confirmed', 'failed']).notNullable().defaultTo('pending')
      table.string('tx_hash', 66).nullable() // Transaction hash for on-chain verification
      table.integer('verification_attempts').notNullable().defaultTo(0) // Track retry attempts
      table.text('verification_error').nullable() // Store error message for failed verifications
      table.boolean('active').notNullable().defaultTo(true)
      table.boolean('archived').notNullable().defaultTo(false)
      table.decimal('total_received', 78, 0).notNullable().defaultTo(0) // wei
      table.decimal('total_collected', 78, 0).notNullable().defaultTo(0) // wei
      table.integer('payment_count').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('archived_at', { useTz: true }).nullable()

      table.index(['user_id', 'active'])
      table.index(['status']) // For reconciliation queries
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
