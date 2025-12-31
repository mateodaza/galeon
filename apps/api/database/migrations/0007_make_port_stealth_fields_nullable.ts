import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Make stealth fields nullable for two-step port creation flow:
 * 1. POST /ports { name } → returns { id }
 * 2. Frontend derives keys using port.id as seed
 * 3. PATCH /ports/:id { stealthMetaAddress, viewingKey }
 */
export default class extends BaseSchema {
  async up() {
    this.schema.alterTable('ports', (table) => {
      table.text('stealth_meta_address').nullable().alter()
      table.text('viewing_key_encrypted').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable('ports', (table) => {
      table.text('stealth_meta_address').notNullable().alter()
      table.text('viewing_key_encrypted').notNullable().alter()
    })
  }
}
