import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'collections'

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
      table.string('recipient_wallet', 42).notNullable()
      table
        .enum('status', ['pending', 'processing', 'completed', 'failed'])
        .notNullable()
        .defaultTo('pending')
      table.integer('total_receipts').notNullable()
      table.integer('processed_receipts').notNullable().defaultTo(0)
      table.decimal('total_amount', 78, 0).notNullable().defaultTo(0) // wei
      table.jsonb('token_amounts').notNullable().defaultTo('{}') // { tokenAddress: amount }
      table.string('tx_hash', 66).nullable() // final collection tx
      table.text('error_message').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()
      table.timestamp('completed_at', { useTz: true }).nullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
