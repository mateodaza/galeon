import { Job } from 'adonisjs-jobs'
import SentPayment from '#models/sent_payment'
import ChainService from '#services/chain_service'
import { createPublicClient, http, type PublicClient, type Chain } from 'viem'
import { mantle, mantleSepoliaTestnet } from 'viem/chains'

/**
 * VerifySentPayments Job
 *
 * Scheduled job to verify pending sent payments against the blockchain.
 * - Queries all pending sent payments
 * - Checks if transaction exists on-chain (using per-chain RPC)
 * - If found and successful, marks as confirmed
 * - If transaction failed, marks as failed
 * - If not found after MAX_ATTEMPTS, marks as failed
 *
 * Note: This is needed because sent payments are recorded immediately
 * when sendTransaction returns, but the transaction might still be pending
 * or could fail. This job ensures the status is eventually correct.
 */

const MAX_VERIFICATION_ATTEMPTS = 10 // Stop retrying after 10 attempts (~10 minutes)

// Map chainId to viem chain config
const CHAIN_CONFIGS: Record<number, Chain> = {
  5000: mantle,
  5003: mantleSepoliaTestnet,
}

export interface VerifySentPaymentsPayload {
  batchSize?: number
}

export default class VerifySentPayments extends Job {
  async handle(payload: VerifySentPaymentsPayload) {
    const batchSize = payload.batchSize ?? 100
    this.logger?.info(`VerifySentPayments job started with batchSize: ${batchSize}`)

    // Get pending sent payments
    const pendingPayments = await SentPayment.query()
      .where('status', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(batchSize)

    this.logger?.info(`Found ${pendingPayments.length} pending sent payments to verify`)

    if (pendingPayments.length === 0) {
      return
    }

    // Create per-chain public clients (lazy, cached)
    const clientCache = new Map<number, PublicClient>()
    const getClient = (chainId: number): PublicClient | null => {
      if (clientCache.has(chainId)) {
        return clientCache.get(chainId)!
      }

      const chainConfig = CHAIN_CONFIGS[chainId]
      if (!chainConfig) {
        this.logger?.warn(`Unsupported chain ${chainId} for payment verification`)
        return null
      }

      // Get RPC URL from ChainService
      const rpcUrl = ChainService.getChain(chainId).rpcUrl
      const client = createPublicClient({
        chain: chainConfig,
        transport: http(rpcUrl),
      })
      clientCache.set(chainId, client)
      return client
    }

    let verified = 0
    let notFound = 0
    let failed = 0
    let skipped = 0

    for (const payment of pendingPayments) {
      try {
        // Get chain-specific client
        const publicClient = getClient(payment.chainId)
        if (!publicClient) {
          // Skip payments on unsupported chains (don't mark as failed)
          skipped++
          continue
        }

        // Check transaction receipt on-chain
        const receipt = await publicClient.getTransactionReceipt({
          hash: payment.txHash as `0x${string}`,
        })

        if (receipt) {
          // Transaction found - check status
          if (receipt.status === 'success') {
            payment.status = 'confirmed'
            payment.blockNumber = receipt.blockNumber.toString()
            payment.verificationError = null
            await payment.save()
            verified++
            this.logger?.info(`Verified sent payment ${payment.id} from tx ${payment.txHash}`)
          } else {
            // Transaction reverted
            payment.status = 'failed'
            payment.verificationError = 'Transaction reverted on-chain'
            await payment.save()
            failed++
            this.logger?.warn(`Sent payment ${payment.id} failed: tx ${payment.txHash} reverted`)
          }
        } else {
          // Transaction not found yet - increment attempt counter
          payment.verificationAttempts = (payment.verificationAttempts ?? 0) + 1

          if (payment.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            payment.status = 'failed'
            payment.verificationError = 'Transaction not found on-chain after maximum attempts'
            await payment.save()
            failed++
            this.logger?.warn(
              `Sent payment ${payment.id} marked as failed: tx ${payment.txHash} not found after ${MAX_VERIFICATION_ATTEMPTS} attempts`
            )
          } else {
            await payment.save()
            notFound++
          }
        }
      } catch (error) {
        // Handle case where tx hash is invalid or RPC error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // If the error indicates the transaction doesn't exist
        if (
          errorMessage.includes('Transaction with hash') ||
          errorMessage.includes('could not be found')
        ) {
          payment.verificationAttempts = (payment.verificationAttempts ?? 0) + 1

          if (payment.verificationAttempts >= MAX_VERIFICATION_ATTEMPTS) {
            payment.status = 'failed'
            payment.verificationError = 'Transaction not found on-chain'
            await payment.save()
            failed++
          } else {
            await payment.save()
            notFound++
          }
        } else {
          this.logger?.error(`Error verifying sent payment ${payment.id}: ${errorMessage}`)
        }
      }
    }

    this.logger?.info(
      `VerifySentPayments job completed: ${verified} verified, ${notFound} not found yet, ${failed} failed, ${skipped} skipped (unsupported chain)`
    )
  }
}
