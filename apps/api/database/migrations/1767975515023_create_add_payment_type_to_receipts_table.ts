import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'receipts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Payment type: regular (sender visible), stealth_pay (via port), private_send (via pool)
      table.string('payment_type', 20).nullable().defaultTo('regular')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('payment_type')
    })
  }
}
