import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sent_payments'

  async up() {
    // MIGRATION DISABLED - NO LONGER SAFE
    //
    // Original intent: Update old sent payments from 'pending' to 'confirmed'
    // when payments were recorded AFTER tx success.
    //
    // Current flow: Payments are created as 'pending' and verified by the
    // VerifySentPayments job. Running this migration would mark unverified
    // payments as confirmed incorrectly.
    //
    // If you need to fix old pending records, do it manually with a date filter:
    // UPDATE sent_payments SET status = 'confirmed'
    // WHERE status = 'pending' AND created_at < '2025-01-09'
    console.log(
      '[Migration] Skipping pending->confirmed migration (now handled by VerifySentPayments job)'
    )
  }

  async down() {
    // No rollback needed
  }
}
