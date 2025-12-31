import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'fog_payments'

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

      // Fog wallet info
      table.string('fog_address', 42).notNullable() // The stealth address of fog wallet
      table.integer('fog_index').notNullable() // Index used with deriveFogKeys()

      // Funding chain (for Shipwreck compliance - tracks money flow)
      table.string('funding_tx_hash', 66).nullable() // tx that funded this fog wallet
      table.string('funding_from', 42).nullable() // address that funded (main wallet or another fog)
      table.decimal('funding_amount', 78, 0).nullable() // amount funded (wei)
      table.timestamp('funded_at', { useTz: true }).nullable()
      // If funded from another fog wallet, link to parent fog payment for hop chain tracing
      table.uuid('parent_fog_payment_id').nullable()

      // Encrypted fog keys for THIS payment only (encrypted with backend's pubkey)
      // Contains: { spendingPrivateKey, viewingPrivateKey, ephemeralPrivateKey }
      table.text('fog_keys_encrypted').notNullable()
      table.text('fog_keys_nonce').notNullable()

      // Recipient details (Bob's stealth address info)
      table.string('recipient_stealth_address', 42).notNullable()
      table.text('recipient_ephemeral_pub_key').notNullable() // 33 bytes hex
      table.smallint('recipient_view_tag').notNullable() // 0-255
      table.string('receipt_hash', 66).notNullable() // bytes32, matches computeReceiptHash()

      // Payment amount
      table.decimal('amount', 78, 0).notNullable() // wei
      table.string('token_address', 42).nullable() // null for native MNT

      // Time bounds
      table.timestamp('send_at', { useTz: true }).notNullable() // When to execute
      table.timestamp('expires_at', { useTz: true }).notNullable() // Max execution time

      // User's signed authorization (proves user authorized this specific payment)
      table.text('user_signature').notNullable()
      table.text('authorization_message').notNullable() // The message that was signed

      // Execution status
      table
        .enum('status', ['pending', 'processing', 'executed', 'failed', 'expired', 'cancelled'])
        .notNullable()
        .defaultTo('pending')
      table.string('tx_hash', 66).nullable() // Set on successful execution
      table.timestamp('executed_at', { useTz: true }).nullable()
      table.text('error_message').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      // Indexes
      table.index(['user_id'])
      table.index(['status'])
      table.index(['send_at']) // For job scheduling
      table.index(['status', 'send_at']) // Find pending payments due for execution
      table.index(['fog_address']) // For isFogPayment lookups
      table.index(['parent_fog_payment_id']) // For hop chain queries
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
