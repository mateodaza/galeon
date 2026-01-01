import { Job } from 'adonisjs-jobs'
import Port from '#models/port'
import PonderService from '#services/ponder_service'

/**
 * VerifyPorts Job
 *
 * Scheduled job to verify pending ports against the Ponder indexer database.
 * - Queries all pending ports with a txHash
 * - Checks Ponder DB for corresponding port registration
 * - SECURITY: Verifies ownership by matching owner address and stealthMetaAddress
 * - If valid, updates indexerPortId and marks as confirmed
 * - If ownership mismatch, marks as failed
 * - If not found after MAX_ATTEMPTS, marks as failed
 */

const MAX_VERIFICATION_ATTEMPTS = 10 // Stop retrying after 10 attempts (~10 minutes)

export interface VerifyPortsPayload {
  batchSize?: number
  ponderService?: PonderService // For testing - allows injecting a mock
  userWalletResolver?: (userId: number) => Promise<string | null> // For testing
}

export default class VerifyPorts extends Job {
  async handle(payload: VerifyPortsPayload) {
    const batchSize = payload.batchSize ?? 100
    this.logger?.info(`VerifyPorts job started with batchSize: ${batchSize}`)

    const ponderService = payload.ponderService ?? new PonderService()

    // Get pending ports that have a txHash (submitted to chain)
    const pendingPorts = await Port.query()
      .where('status', 'pending')
      .whereNotNull('txHash')
      .preload('user') // Load user for ownership verification
      .orderBy('createdAt', 'asc')
      .limit(batchSize)

    this.logger?.info(`Found ${pendingPorts.length} pending ports to verify`)

    let verified = 0
    let notFound = 0
    let failed = 0

    for (const port of pendingPorts) {
      try {
        // Look up port by transaction hash and chainId
        const indexedPort = await ponderService.findPortByTxHash(port.txHash!, port.chainId)

        if (!indexedPort) {
          // Not indexed yet - increment attempt counter
          port.verificationAttempts = (port.verificationAttempts ?? 0) + 1

          if (port.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            port.status = 'failed'
            port.verificationError = 'Transaction not found in indexer after maximum attempts'
            await port.save()
            failed++
            this.logger?.warn(
              `Port ${port.id} marked as failed: tx ${port.txHash} not found after ${MAX_VERIFICATION_ATTEMPTS} attempts`
            )
          } else {
            await port.save()
            notFound++
          }
          continue
        }

        // Get user wallet address for ownership verification
        const userWallet = payload.userWalletResolver
          ? await payload.userWalletResolver(port.userId)
          : port.user?.walletAddress

        if (!userWallet) {
          port.status = 'failed'
          port.verificationError = 'User not found'
          await port.save()
          failed++
          this.logger?.error(`Port ${port.id} marked as failed: user ${port.userId} not found`)
          continue
        }

        // SECURITY: Verify ownership - the indexed port owner must match the user's wallet
        if (indexedPort.owner.toLowerCase() !== userWallet.toLowerCase()) {
          port.status = 'failed'
          port.verificationError = `Ownership mismatch: indexed port owner ${indexedPort.owner} does not match user wallet ${userWallet}`
          await port.save()
          failed++
          this.logger?.warn(
            `Port ${port.id} marked as failed: ownership mismatch (indexed: ${indexedPort.owner}, user: ${userWallet})`
          )
          continue
        }

        // SECURITY: Verify stealthMetaAddress matches
        if (
          port.stealthMetaAddress &&
          indexedPort.stealthMetaAddress.toLowerCase() !== port.stealthMetaAddress.toLowerCase()
        ) {
          port.status = 'failed'
          port.verificationError = `Stealth meta address mismatch: indexed ${indexedPort.stealthMetaAddress} does not match local ${port.stealthMetaAddress}`
          await port.save()
          failed++
          this.logger?.warn(
            `Port ${port.id} marked as failed: stealthMetaAddress mismatch (indexed: ${indexedPort.stealthMetaAddress}, local: ${port.stealthMetaAddress})`
          )
          continue
        }

        // All checks passed - update port with indexer data and mark as confirmed
        port.indexerPortId = indexedPort.id
        port.status = 'confirmed'
        port.verificationError = null
        await port.save()

        verified++
        this.logger?.info(
          `Verified port ${port.id} from tx ${port.txHash}, indexerPortId: ${indexedPort.id}`
        )
      } catch (error) {
        this.logger?.error(`Error verifying port ${port.id}: ${error}`)
      }
    }

    this.logger?.info(
      `VerifyPorts job completed: ${verified} verified, ${notFound} not found yet, ${failed} failed`
    )
  }
}
