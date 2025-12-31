import { Job } from 'adonisjs-jobs'
import Receipt from '#models/receipt'
import PonderService from '#services/ponder_service'

/**
 * VerifyReceipts Job
 *
 * Scheduled job to verify pending receipts against the Ponder indexer database.
 * - Queries all pending receipts
 * - Checks Ponder DB for corresponding announcement
 * - If found, fills in receipt data and marks as confirmed
 * - If not found, leaves as pending for next job run
 */
interface VerifyReceiptsPayload {
  batchSize?: number
}

export default class VerifyReceipts extends Job {
  async handle(payload: VerifyReceiptsPayload) {
    const batchSize = payload.batchSize ?? 100
    this.logger.info(`VerifyReceipts job started with batchSize: ${batchSize}`)

    const ponderService = new PonderService()

    // Get pending receipts
    const pendingReceipts = await Receipt.query()
      .where('status', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(batchSize)

    this.logger.info(`Found ${pendingReceipts.length} pending receipts to verify`)

    let verified = 0
    let notFound = 0

    for (const receipt of pendingReceipts) {
      try {
        // Look up announcement by transaction hash
        const announcement = await ponderService.findAnnouncementByTxHash(receipt.txHash)

        if (!announcement) {
          // Not indexed yet, will retry on next job run
          notFound++
          continue
        }

        // Fill in receipt data from announcement
        receipt.stealthAddress = announcement.stealthAddress
        receipt.ephemeralPubKey = announcement.ephemeralPubKey
        receipt.viewTag = announcement.viewTag
        receipt.payerAddress = announcement.caller
        receipt.blockNumber = announcement.blockNumber
        receipt.receiptHash = announcement.receiptHash ?? ''

        // Try to get amount from receipts_anchored table
        const receiptAnchored = await ponderService.findReceiptAnchoredByTxHash(receipt.txHash)
        if (receiptAnchored) {
          receipt.amount = receiptAnchored.amount
          receipt.tokenAddress =
            receiptAnchored.token === '0x0000000000000000000000000000000000000000'
              ? null
              : receiptAnchored.token
          receipt.currency =
            receiptAnchored.token === '0x0000000000000000000000000000000000000000' ? 'ETH' : 'TOKEN'
        }

        // Mark as confirmed
        receipt.status = 'confirmed'
        await receipt.save()

        verified++
        this.logger.info(`Verified receipt ${receipt.id} from tx ${receipt.txHash}`)
      } catch (error) {
        this.logger.error(`Error verifying receipt ${receipt.id}: ${error}`)
      }
    }

    this.logger.info(
      `VerifyReceipts job completed: ${verified} verified, ${notFound} not found yet`
    )
  }
}
