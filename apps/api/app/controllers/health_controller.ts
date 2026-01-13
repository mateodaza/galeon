/**
 * Health Controller
 *
 * Exposes health check and pre-flight validation endpoints.
 * Used by frontend to check sync status before critical operations.
 */

import type { HttpContext } from '@adonisjs/core/http'
import HealthService from '#services/health_service'
import PreflightService from '#services/preflight_service'

export default class HealthController {
  /**
   * GET /api/v1/health/status
   * Returns overall system health and operation availability.
   */
  async status({ request, response }: HttpContext) {
    try {
      const chainId = request.input('chainId')
        ? Number.parseInt(request.input('chainId'))
        : undefined

      const healthService = new HealthService()
      const health = await healthService.getSystemHealth(chainId)

      return response.ok(health)
    } catch (error) {
      console.error('[HealthController] Status check failed:', error)
      return response.internalServerError({
        error: error instanceof Error ? error.message : 'Health check failed',
      })
    }
  }

  /**
   * GET /api/v1/health/preflight/:operation
   * Validates that all dependencies are met for a specific operation.
   *
   * Operations:
   * - quickpay: Direct stealth payment (minimal checks)
   * - stealthpay: Sending from stealth addresses (needs indexer)
   * - privatesend: Pool withdrawal (needs everything synced)
   *
   * Query params for privatesend:
   * - poolAddress: Pool contract address
   * - depositLabel: Label of the deposit to withdraw from
   * - chainId: Chain ID (optional, defaults to configured chain)
   */
  async preflight({ params, request, response }: HttpContext) {
    try {
      const operation = params.operation?.toLowerCase()
      const chainId = request.input('chainId')
        ? Number.parseInt(request.input('chainId'))
        : undefined

      const preflightService = new PreflightService()

      switch (operation) {
        case 'quickpay': {
          const result = await preflightService.preflightQuickPay(chainId)
          return response.ok(result)
        }

        case 'stealthpay': {
          const result = await preflightService.preflightStealthPay(chainId)
          return response.ok(result)
        }

        case 'privatesend': {
          const poolAddress = request.input('poolAddress')
          const depositLabel = request.input('depositLabel')

          if (!poolAddress) {
            return response.badRequest({
              error: 'poolAddress is required for privatesend preflight',
            })
          }

          if (!depositLabel) {
            return response.badRequest({
              error: 'depositLabel is required for privatesend preflight',
            })
          }

          const result = await preflightService.preflightPrivateSend({
            poolAddress,
            depositLabel,
            chainId,
          })

          return response.ok(result)
        }

        default:
          return response.badRequest({
            error: `Unknown operation: ${operation}. Valid operations: quickpay, stealthpay, privatesend`,
          })
      }
    } catch (error) {
      console.error('[HealthController] Preflight check failed:', error)
      return response.internalServerError({
        error: error instanceof Error ? error.message : 'Preflight check failed',
      })
    }
  }

  /**
   * GET /api/v1/health/pool-privacy
   * Returns privacy health metrics for the pool.
   * Measures anonymity set size, unique depositors, and provides recommendations.
   *
   * Query params:
   * - pool: Pool address (optional, defaults to configured pool)
   */
  async poolPrivacy({ request, response }: HttpContext) {
    try {
      const poolAddress = request.input('pool')

      const healthService = new HealthService()
      const privacy = await healthService.getPoolPrivacyHealth(poolAddress)

      return response.ok(privacy)
    } catch (error) {
      console.error('[HealthController] Pool privacy check failed:', error)
      return response.internalServerError({
        error: error instanceof Error ? error.message : 'Pool privacy check failed',
      })
    }
  }

  /**
   * GET /api/v1/health/indexer
   * Returns indexer sync status specifically.
   */
  async indexer({ request, response }: HttpContext) {
    try {
      const chainId = request.input('chainId')
        ? Number.parseInt(request.input('chainId'))
        : undefined

      const healthService = new HealthService()
      const health = await healthService.getSystemHealth(chainId)

      const indexerHealth = health.components.find((c) => c.component === 'indexer')

      return response.ok({
        status: indexerHealth?.status ?? 'unknown',
        lastBlock: indexerHealth?.details.lastBlock,
        chainHead: indexerHealth?.details.chainHead,
        blocksBehind: indexerHealth?.details.blocksBehind,
        timestamp: health.timestamp,
      })
    } catch (error) {
      console.error('[HealthController] Indexer check failed:', error)
      return response.internalServerError({
        error: error instanceof Error ? error.message : 'Indexer check failed',
      })
    }
  }
}
