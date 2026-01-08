import type { HttpContext } from '@adonisjs/core/http'
import Port from '#models/port'
import {
  createPortValidator,
  updatePortValidator,
  portIdValidator,
  listPortsValidator,
} from '#validators/port'
import SyncService from '#services/sync_service'

export default class PortsController {
  /**
   * GET /ports
   * List all ports for the authenticated user
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const {
      page = 1,
      limit = 20,
      includeArchived = false,
    } = await listPortsValidator.validate(request.qs())

    const query = Port.query().where('userId', user.id).orderBy('createdAt', 'desc')

    if (!includeArchived) {
      query.where('archived', false)
    }

    const ports = await query.paginate(page, limit)

    return response.ok({
      data: ports.all().map((port) => ({
        id: port.id,
        indexerPortId: port.indexerPortId,
        name: port.name,
        stealthMetaAddress: port.stealthMetaAddress,
        chainId: port.chainId,
        status: port.status,
        txHash: port.txHash,
        totalReceived: port.totalReceived,
        totalCollected: port.totalCollected,
        archived: port.archived,
        createdAt: port.createdAt,
      })),
      meta: {
        total: ports.total,
        perPage: ports.perPage,
        currentPage: ports.currentPage,
        lastPage: ports.lastPage,
      },
    })
  }

  /**
   * POST /ports
   * Create a new port (step 1 of two-step flow)
   *
   * Returns the port ID which frontend uses to derive keys.
   * Frontend then calls PATCH with stealthMetaAddress and viewingKey.
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await createPortValidator.validate(request.body())

    const port = await Port.create({
      userId: user.id,
      name: data.name ?? 'Unnamed Port',
      type: 'permanent',
      chainId: data.chainId ?? 5000,
      status: 'pending',
    })

    await port.refresh()

    return response.created({
      id: port.id,
      indexerPortId: port.indexerPortId,
      name: port.name,
      stealthMetaAddress: port.stealthMetaAddress,
      chainId: port.chainId,
      status: port.status,
      txHash: port.txHash,
      totalReceived: port.totalReceived,
      totalCollected: port.totalCollected,
      archived: port.archived,
      createdAt: port.createdAt,
    })
  }

  /**
   * GET /ports/:id
   * Get a single port by ID
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = await portIdValidator.validate(params)

    const port = await Port.query().where('id', id).where('userId', user.id).first()

    if (!port) {
      return response.notFound({
        error: 'Port not found',
      })
    }

    return response.ok({
      id: port.id,
      indexerPortId: port.indexerPortId,
      name: port.name,
      stealthMetaAddress: port.stealthMetaAddress,
      chainId: port.chainId,
      status: port.status,
      txHash: port.txHash,
      totalReceived: port.totalReceived,
      totalCollected: port.totalCollected,
      archived: port.archived,
      createdAt: port.createdAt,
      updatedAt: port.updatedAt,
    })
  }

  /**
   * PATCH /ports/:id
   * Update a port
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { id } = await portIdValidator.validate(params)
    const data = await updatePortValidator.validate(request.body())

    const port = await Port.query().where('id', id).where('userId', user.id).first()

    if (!port) {
      return response.notFound({
        error: 'Port not found',
      })
    }

    if (data.name !== undefined) {
      port.name = data.name
    }
    if (data.archived !== undefined) {
      port.archived = data.archived
    }
    if (data.txHash !== undefined) {
      port.txHash = data.txHash
    }
    if (data.status !== undefined) {
      port.status = data.status
    }
    if (data.indexerPortId !== undefined) {
      port.indexerPortId = data.indexerPortId
    }
    // Step 2 of two-step creation: add stealth keys
    if (data.stealthMetaAddress !== undefined) {
      // Check for duplicates
      const existing = await Port.query()
        .where('userId', port.userId)
        .where('stealthMetaAddress', data.stealthMetaAddress)
        .whereNot('id', port.id)
        .first()
      if (existing) {
        return response.conflict({
          error: 'Port with this stealth meta address already exists',
        })
      }
      port.stealthMetaAddress = data.stealthMetaAddress
    }
    if (data.viewingKey !== undefined) {
      port.viewingKeyEncrypted = Port.encryptViewingKey(data.viewingKey)
    }

    await port.save()

    return response.ok({
      id: port.id,
      indexerPortId: port.indexerPortId,
      name: port.name,
      stealthMetaAddress: port.stealthMetaAddress,
      chainId: port.chainId,
      status: port.status,
      txHash: port.txHash,
      totalReceived: port.totalReceived,
      totalCollected: port.totalCollected,
      archived: port.archived,
      createdAt: port.createdAt,
      updatedAt: port.updatedAt,
    })
  }

  /**
   * DELETE /ports/:id
   * Archive a port (soft delete)
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = await portIdValidator.validate(params)

    const port = await Port.query().where('id', id).where('userId', user.id).first()

    if (!port) {
      return response.notFound({
        error: 'Port not found',
      })
    }

    // Soft delete by archiving
    port.archived = true
    await port.save()

    return response.ok({
      message: 'Port archived successfully',
    })
  }

  /**
   * POST /ports/sync
   * Sync all receipts from on-chain announcements for all user's ports.
   * This scans the Ponder indexer for payments matching the user's ports
   * and creates receipt records for any that don't exist yet.
   *
   * Should be called on session start/refresh to ensure receipts are up-to-date.
   */
  async sync({ auth, response, logger }: HttpContext) {
    const user = auth.user!
    const syncService = new SyncService()

    try {
      const result = await syncService.syncUserPorts(user.id)

      logger.info(
        `Synced ${result.total.synced} receipts for user ${user.id} across ${result.ports} ports`
      )

      return response.ok({
        ports: result.ports,
        synced: result.total.synced,
        existing: result.total.existing,
        scanned: result.total.scanned,
        errors: result.total.errors.length > 0 ? result.total.errors : undefined,
      })
    } catch (error) {
      logger.error(`Sync failed for user ${user.id}: ${error}`)
      return response.internalServerError({
        error: 'Failed to sync receipts',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }
}
