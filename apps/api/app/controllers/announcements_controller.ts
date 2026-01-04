import type { HttpContext } from '@adonisjs/core/http'
import PonderService from '#services/ponder_service'

export default class AnnouncementsController {
  /**
   * GET /announcements
   * List announcements from the indexer with pagination.
   * This endpoint is public (no auth required) for payment scanning.
   *
   * Query params:
   * - viewTag: Filter by view tag (number)
   * - stealthAddress: Filter by stealth address (string)
   * - chainId: Filter by chain ID (number)
   * - limit: Max results per page (default 500, max 1000)
   * - offset: Pagination offset (default 0)
   */
  async index({ request, response, logger }: HttpContext) {
    const { viewTag, stealthAddress, chainId, limit, offset } = request.qs()

    try {
      const ponderService = new PonderService()
      const result = await ponderService.listAnnouncements({
        viewTag: viewTag !== undefined ? Number(viewTag) : undefined,
        stealthAddress: stealthAddress as string | undefined,
        chainId: chainId !== undefined ? Number(chainId) : undefined,
        limit: limit !== undefined ? Number(limit) : undefined,
        offset: offset !== undefined ? Number(offset) : undefined,
      })

      return response.ok({
        data: result.data,
        hasMore: result.hasMore,
        limit:
          limit !== undefined
            ? Math.min(Number(limit), PonderService.MAX_ANNOUNCEMENTS_LIMIT)
            : PonderService.DEFAULT_ANNOUNCEMENTS_LIMIT,
        offset: offset !== undefined ? Number(offset) : 0,
      })
    } catch (error) {
      // If table doesn't exist, return empty result (indexer not running)
      if (error instanceof Error && error.message.includes('does not exist')) {
        logger.warn('Announcements table does not exist - indexer may not be running')
        return response.ok({
          data: [],
          hasMore: false,
          limit: PonderService.DEFAULT_ANNOUNCEMENTS_LIMIT,
          offset: 0,
        })
      }
      throw error
    }
  }
}
