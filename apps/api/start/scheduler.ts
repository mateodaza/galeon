/**
 * Scheduler Configuration
 *
 * This file defines recurring scheduled tasks that dispatch jobs to the BullMQ queue.
 * The scheduler triggers the jobs, but actual work happens in the job workers.
 *
 * Run locally:   node ace scheduler:run
 * Watch mode:    node ace scheduler:run --watch
 * List tasks:    node ace scheduler:list
 *
 * For Railway/production, run as a separate process alongside the job worker.
 */

import scheduler from 'adonisjs-scheduler/services/main'

// Import job classes
import VerifyPorts from '#jobs/verify_ports'
import VerifyReceipts from '#jobs/verify_receipts'
import VerifySentPayments from '#jobs/verify_sent_payments'
import UpdateASPRoot from '#jobs/update_asp_root'

/**
 * Verify pending ports against the Ponder indexer.
 * Runs every minute to check if on-chain port registrations have been indexed.
 */
scheduler
  .call(async () => {
    await VerifyPorts.dispatch({ batchSize: 100 })
  })
  .everyMinute()
  .withoutOverlapping()

/**
 * Verify pending receipts against the Ponder indexer.
 * Runs every minute to check if on-chain announcements have been indexed.
 */
scheduler
  .call(async () => {
    await VerifyReceipts.dispatch({ batchSize: 100 })
  })
  .everyMinute()
  .withoutOverlapping()

/**
 * Verify pending sent payments against the blockchain.
 * Runs every minute to confirm transactions were successfully mined.
 */
scheduler
  .call(async () => {
    await VerifySentPayments.dispatch({ batchSize: 100 })
  })
  .everyMinute()
  .withoutOverlapping()

/**
 * Update ASP (Association Set Provider) root.
 * Runs every 30 seconds to:
 * - Auto-approve new deposit labels into the ASP Merkle tree
 * - Update the on-chain ASP root if the tree has changed
 *
 * For hackathon: auto-approves ALL labels (no sanctions check).
 */
scheduler
  .call(async () => {
    await UpdateASPRoot.dispatch({})
  })
  .everyThirtySeconds()
  .withoutOverlapping()
