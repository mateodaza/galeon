import { Job } from 'adonisjs-jobs'
import ASPService, { getSharedASPService } from '#services/asp_service'

/**
 * UpdateASPRoot Job
 *
 * Scheduled job to auto-approve new deposit labels and update the on-chain ASP root.
 *
 * Flow:
 * 1. On first run, initializes from Redis (or rebuilds from indexer if Redis empty)
 * 2. Processes any new deposits since last check
 * 3. If tree root changed, updates on-chain root via Entrypoint.updateRoot()
 *
 * For hackathon: auto-approves ALL labels (no sanctions/blocklist check).
 * Production: would check depositor addresses against sanctions lists before approval.
 *
 * Schedule: Every 30 seconds (configured in start/scheduler.ts)
 *
 * Redis Persistence:
 * - State is persisted to Redis so all processes share the same tree
 * - Survives restarts without needing to rebuild from indexer
 */

export interface UpdateASPRootPayload {
  forceRebuild?: boolean
  aspService?: ASPService // For testing - allows injecting a mock
}

function getASPServiceForJob(payload?: UpdateASPRootPayload): ASPService {
  // Allow mock injection for tests
  if (payload?.aspService) {
    return payload.aspService
  }
  // Use shared singleton for production
  return getSharedASPService()
}

export default class UpdateASPRoot extends Job {
  async handle(payload: UpdateASPRootPayload = {}) {
    // Check if configured
    if (!ASPService.isConfigured()) {
      this.logger?.debug('ASP service not configured, skipping')
      return
    }

    const aspService = getASPServiceForJob(payload)

    // Force rebuild if requested
    if (payload.forceRebuild) {
      this.logger?.info('Force rebuilding ASP tree from indexer...')

      const { labelsAdded, root } = await aspService.rebuildFromDeposits()

      this.logger?.info(
        `ASP tree rebuilt: ${labelsAdded} labels, root: ${root.toString().slice(0, 20)}...`
      )

      // Update on-chain root after rebuild if needed
      if (labelsAdded > 0) {
        const { updated, txHash, newRoot } = await aspService.updateOnChainRoot()
        if (updated) {
          this.logger?.info(
            `On-chain ASP root updated: ${newRoot.toString().slice(0, 20)}..., tx: ${txHash}`
          )
        }
      }
      return
    }

    // Initialize from Redis (or rebuild from indexer if no Redis state)
    const { source, labelsLoaded } = await aspService.initialize()

    if (source === 'indexer') {
      this.logger?.info(`Initialized ASP tree from indexer: ${labelsLoaded} labels`)

      // Update on-chain root after initial rebuild if needed
      if (labelsLoaded > 0) {
        const { updated, txHash, newRoot } = await aspService.updateOnChainRoot()
        if (updated) {
          this.logger?.info(
            `On-chain ASP root updated: ${newRoot.toString().slice(0, 20)}..., tx: ${txHash}`
          )
        }
      }
      return
    }

    // Redis state loaded, process new deposits
    const { newLabels, newRoot } = await aspService.processNewDeposits()

    if (newLabels.length === 0) {
      this.logger?.debug(`No new deposits (tree size: ${aspService.size})`)
      return
    }

    this.logger?.info(`Approved ${newLabels.length} new deposit labels`)

    // Update on-chain root
    const { updated, txHash } = await aspService.updateOnChainRoot()

    if (updated) {
      this.logger?.info(
        `On-chain ASP root updated: ${newRoot.toString().slice(0, 20)}..., tx: ${txHash}, tree size: ${aspService.size}`
      )
    } else {
      this.logger?.debug('On-chain root already synced')
    }
  }
}
