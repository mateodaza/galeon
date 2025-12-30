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
      table.string('port_id', 66).notNullable().unique() // bytes32 hex
      table.string('name', 255).notNullable()
      table.enum('type', ['permanent', 'recurring', 'one-time', 'burner']).notNullable()
      table.text('stealth_meta_address').notNullable()
      table.text('viewing_key_encrypted').notNullable()
      table.text('viewing_key_nonce').notNullable() // IV for AES-GCM decryption
      table.integer('chain_id').notNullable().defaultTo(5000) // Mantle Mainnet
      table.boolean('active').notNullable().defaultTo(true)
      table.boolean('archived').notNullable().defaultTo(false)
      table.decimal('total_received', 78, 0).notNullable().defaultTo(0) // wei
      table.decimal('total_collected', 78, 0).notNullable().defaultTo(0) // wei
      table.integer('payment_count').notNullable().defaultTo(0)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('archived_at', { useTz: true }).nullable()

      table.index(['user_id', 'active'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
