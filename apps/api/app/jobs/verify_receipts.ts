import { Job } from 'adonisjs-jobs'
import Receipt from '#models/receipt'
import type { PaymentType } from '#models/receipt'
import PonderService from '#services/ponder_service'
import { CONTRACTS } from '@galeon/config'

/**
 * VerifyReceipts Job
 *
 * Scheduled job to verify pending receipts against the Ponder indexer database.
 * - Queries all pending receipts with a txHash
 * - Checks Ponder DB for corresponding announcement
 * - If found, fills in receipt data and marks as confirmed
 * - If not found after MAX_ATTEMPTS, marks as failed
 */

const MAX_VERIFICATION_ATTEMPTS = 10 // Stop retrying after 10 attempts (~10 minutes)

/**
 * Detect payment type based on the caller address.
 * - If caller is GaleonRegistry → stealth_pay (payment from another port)
 * - If caller is Privacy Pool → private_send (ZK private payment)
 * - Otherwise → regular (direct wallet payment, sender visible)
 */
function detectPaymentType(callerAddress: string, chainId: number): PaymentType {
  const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
  if (!contracts) return 'regular'

  const caller = callerAddress.toLowerCase()
  const registry = contracts.stealth.galeonRegistry.toLowerCase()
  const pool = contracts.pool.pool.toLowerCase()

  if (caller === registry) return 'stealth_pay'
  if (caller === pool) return 'private_send'
  return 'regular'
}

export interface VerifyReceiptsPayload {
  batchSize?: number
  ponderService?: PonderService // For testing - allows injecting a mock
}

export default class VerifyReceipts extends Job {
  async handle(payload: VerifyReceiptsPayload) {
    const batchSize = payload.batchSize ?? 100
    this.logger?.info(`VerifyReceipts job started with batchSize: ${batchSize}`)

    const ponderService = payload.ponderService ?? new PonderService()

    // Get pending receipts
    const pendingReceipts = await Receipt.query()
      .where('status', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(batchSize)

    this.logger?.info(`Found ${pendingReceipts.length} pending receipts to verify`)

    let verified = 0
    let notFound = 0
    let failed = 0

    for (const receipt of pendingReceipts) {
      try {
        // Look up announcement by transaction hash and chainId
        const announcement = await ponderService.findAnnouncementByTxHash(
          receipt.txHash,
          receipt.chainId
        )

        if (!announcement) {
          // Not indexed yet - increment attempt counter
          receipt.verificationAttempts = (receipt.verificationAttempts ?? 0) + 1

          if (receipt.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            receipt.status = 'failed'
            receipt.verificationError = 'Transaction not found in indexer after maximum attempts'
            await receipt.save()
            failed++
            this.logger?.warn(
              `Receipt ${receipt.id} marked as failed: tx ${receipt.txHash} not found after ${MAX_VERIFICATION_ATTEMPTS} attempts`
            )
          } else {
            await receipt.save()
            notFound++
          }
          continue
        }

        // Fill in receipt data from announcement
        receipt.stealthAddress = announcement.stealthAddress
        receipt.ephemeralPubKey = announcement.ephemeralPubKey
        receipt.viewTag = announcement.viewTag
        receipt.payerAddress = announcement.caller
        receipt.blockNumber = announcement.blockNumber
        receipt.receiptHash = announcement.receiptHash ?? ''

        // Detect payment type based on caller address
        receipt.paymentType = detectPaymentType(announcement.caller, receipt.chainId)

        // Try to get amount from receipts_anchored table
        const receiptAnchored = await ponderService.findReceiptAnchoredByTxHash(
          receipt.txHash,
          receipt.chainId
        )
        if (receiptAnchored) {
          receipt.amount = receiptAnchored.amount
          receipt.tokenAddress =
            receiptAnchored.token === '0x0000000000000000000000000000000000000000'
              ? null
              : receiptAnchored.token
          // Use MNT for native token on Mantle, ETH for other chains
          receipt.currency =
            receiptAnchored.token === '0x0000000000000000000000000000000000000000'
              ? receipt.chainId === 5000
                ? 'MNT'
                : 'ETH'
              : 'ERC20'
        }

        // Mark as confirmed and clear any previous error
        receipt.status = 'confirmed'
        receipt.verificationError = null
        await receipt.save()

        verified++
        this.logger?.info(`Verified receipt ${receipt.id} from tx ${receipt.txHash}`)
      } catch (error) {
        this.logger?.error(`Error verifying receipt ${receipt.id}: ${error}`)
      }
    }

    this.logger?.info(
      `VerifyReceipts job completed: ${verified} verified, ${notFound} not found yet, ${failed} failed`
    )
  }
}
