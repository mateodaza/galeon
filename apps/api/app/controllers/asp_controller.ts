/**
 * ASP Controller
 *
 * Provides API endpoints for the ASP (Association Set Provider) service.
 * - GET /status - Get ASP tree status and sync info
 * - GET /proof/:label - Get Merkle proof for a specific label
 */

import type { HttpContext } from '@adonisjs/core/http'
import ASPService from '#services/asp_service'

// Singleton ASP service instance (same as used by the job)
let aspServiceInstance: ASPService | null = null

function getASPService(): ASPService {
  if (!aspServiceInstance) {
    aspServiceInstance = new ASPService()
  }
  return aspServiceInstance
}

export default class AspController {
  /**
   * GET /api/v1/asp/status
   * Returns the current status of the ASP tree and on-chain sync state.
   */
  async status({ response }: HttpContext) {
    try {
      const aspService = getASPService()
      const status = await aspService.getStatus()

      return response.json({
        success: true,
        data: status,
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ASP status',
      })
    }
  }

  /**
   * GET /api/v1/asp/proof/:label
   * Returns the Merkle proof for a specific label in the ASP tree.
   * Required for withdrawal proofs.
   */
  async proof({ params, response }: HttpContext) {
    try {
      const label = params.label as string

      if (!label) {
        return response.status(400).json({
          success: false,
          error: 'Label is required',
        })
      }

      const aspService = getASPService()

      // Parse label as bigint
      let labelBigInt: bigint
      try {
        labelBigInt = BigInt(label)
      } catch {
        return response.status(400).json({
          success: false,
          error: 'Invalid label format',
        })
      }

      // Check if label is in the tree
      if (!aspService.hasLabel(labelBigInt)) {
        return response.status(404).json({
          success: false,
          error: 'Label not found in ASP tree. It may not have been approved yet.',
        })
      }

      // Generate proof
      const proof = aspService.generateProof(labelBigInt)

      return response.json({
        success: true,
        data: {
          root: proof.root.toString(),
          leaf: proof.leaf.toString(),
          index: proof.index.toString(),
          siblings: proof.siblings.map((s) => s.toString()),
          depth: proof.depth,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate proof',
      })
    }
  }

  /**
   * POST /api/v1/asp/rebuild
   * Force rebuild the ASP tree from all deposits.
   * Used for debugging/testing.
   */
  async rebuild({ response }: HttpContext) {
    try {
      if (!ASPService.isConfigured()) {
        return response.status(503).json({
          success: false,
          error: 'ASP service not configured',
        })
      }

      const aspService = getASPService()
      const result = await aspService.rebuildFromDeposits()

      // Also update on-chain if needed
      let onChainUpdate = null
      if (result.labelsAdded > 0) {
        onChainUpdate = await aspService.updateOnChainRoot()
      }

      return response.json({
        success: true,
        data: {
          labelsAdded: result.labelsAdded,
          root: result.root.toString(),
          onChainUpdate: onChainUpdate
            ? {
                updated: onChainUpdate.updated,
                txHash: onChainUpdate.txHash,
                newRoot: onChainUpdate.newRoot.toString(),
              }
            : null,
        },
      })
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rebuild ASP tree',
      })
    }
  }
}
