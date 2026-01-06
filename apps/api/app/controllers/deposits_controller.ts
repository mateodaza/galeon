import type { HttpContext } from '@adonisjs/core/http'
import PonderService from '#services/ponder_service'

export default class DepositsController {
  /**
   * GET /deposits
   * List pool deposits from the indexer with pagination.
   * This endpoint is public (no auth required) for deposit recovery.
   *
   * Query params:
   * - pool: Filter by pool address (string)
   * - chainId: Filter by chain ID (number)
   * - limit: Max results per page (default 500, max 1000)
   * - offset: Pagination offset (default 0)
   */
  async index({ request, response, logger }: HttpContext) {
    const { pool, chainId, limit, offset } = request.qs()

    try {
      const ponderService = new PonderService()
      const result = await ponderService.listPoolDeposits({
        pool: pool as string | undefined,
        chainId: chainId !== undefined ? Number(chainId) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })

      return response.ok({
        data: result.data,
        hasMore: result.hasMore,
        limit:
          limit !== undefined
            ? Math.min(Number(limit), PonderService.MAX_DEPOSITS_LIMIT)
            : PonderService.DEFAULT_DEPOSITS_LIMIT,
        offset: offset !== undefined ? Number(offset) : 0,
      })
    } catch (error) {
      // If table doesn't exist, return empty result (indexer not running)
      if (error instanceof Error && error.message.includes('does not exist')) {
        logger.warn('Pool deposits table does not exist - indexer may not be running')
        return response.ok({
          data: [],
          hasMore: false,
          limit: PonderService.DEFAULT_DEPOSITS_LIMIT,
          offset: 0,
        })
      }
      throw error
    }
  }

  /**
   * GET /deposits/merges
   * List merge deposits from the indexer with pagination.
   * This endpoint is public (no auth required) for deposit recovery.
   *
   * Query params:
   * - pool: Filter by pool address (string)
   * - depositor: Filter by depositor address (string)
   * - chainId: Filter by chain ID (number)
   * - limit: Max results per page (default 500, max 1000)
   * - offset: Pagination offset (default 0)
   */
  async merges({ request, response, logger }: HttpContext) {
    const { pool, depositor, chainId, limit, offset } = request.qs()

    try {
      const ponderService = new PonderService()
      const result = await ponderService.listMergeDeposits({
        pool: pool as string | undefined,
        depositor: depositor as string | undefined,
        chainId: chainId !== undefined ? Number(chainId) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })

      return response.ok({
        data: result.data,
        hasMore: result.hasMore,
        limit:
          limit !== undefined
            ? Math.min(Number(limit), PonderService.MAX_DEPOSITS_LIMIT)
            : PonderService.DEFAULT_DEPOSITS_LIMIT,
        offset: offset !== undefined ? Number(offset) : 0,
      })
    } catch (error) {
      // If table doesn't exist, return empty result (indexer not running)
      if (error instanceof Error && error.message.includes('does not exist')) {
        logger.warn('Pool merge deposits table does not exist - indexer may not be running')
        return response.ok({
          data: [],
          hasMore: false,
          limit: PonderService.DEFAULT_DEPOSITS_LIMIT,
          offset: 0,
        })
      }
      throw error
    }
  }
}
