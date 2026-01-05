import { Job } from 'adonisjs-jobs'
import ASPService from '#services/asp_service'

/**
 * UpdateASPRoot Job
 *
 * Scheduled job to auto-approve new deposit labels and update the on-chain ASP root.
 *
 * Flow:
 * 1. On first run, rebuilds tree from all existing deposits
 * 2. Processes any new deposits since last check
 * 3. If tree root changed, updates on-chain root via Entrypoint.updateRoot()
 *
 * For hackathon: auto-approves ALL labels (no sanctions/blocklist check).
 * Production: would check depositor addresses against sanctions lists before approval.
 *
 * Schedule: Every 30 seconds (configured in start/scheduler.ts)
 */

export interface UpdateASPRootPayload {
  forceRebuild?: boolean
  aspService?: ASPService // For testing - allows injecting a mock
}

// Singleton ASP service instance (persists tree state between job runs)
let aspServiceInstance: ASPService | null = null
let initialized = false

function getASPService(payload?: UpdateASPRootPayload): ASPService {
  if (payload?.aspService) {
    return payload.aspService
  }
  if (!aspServiceInstance) {
    aspServiceInstance = new ASPService()
  }
  return aspServiceInstance
}

export default class UpdateASPRoot extends Job {
  async handle(payload: UpdateASPRootPayload = {}) {
    // Check if configured
    if (!ASPService.isConfigured()) {
      this.logger?.debug('ASP service not configured, skipping')
      return
    }

    const aspService = getASPService(payload)

    // Initialize on first run or if forced
    if (!initialized || payload.forceRebuild) {
      this.logger?.info('Initializing ASP tree from existing deposits...')

      const { labelsAdded, root } = await aspService.rebuildFromDeposits()
      initialized = true

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

    // Process new deposits
    const { newLabels, newRoot } = await aspService.processNewDeposits()

    if (newLabels.length === 0) {
      this.logger?.debug('No new deposits to process')
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
