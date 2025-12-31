import type { HttpContext } from '@adonisjs/core/http'
import Port from '#models/port'
import {
  createPortValidator,
  updatePortValidator,
  portIdValidator,
  listPortsValidator,
} from '#validators/port'

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
        portId: port.portId,
        name: port.name,
        stealthMetaAddress: port.stealthMetaAddress,
        chainId: port.chainId,
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
   * Create a new port
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await createPortValidator.validate(request.body())

    // Check if stealth meta address already exists for this user
    const existing = await Port.query()
      .where('userId', user.id)
      .where('stealthMetaAddress', data.stealthMetaAddress)
      .first()

    if (existing) {
      return response.conflict({
        error: 'Port with this stealth meta address already exists',
      })
    }

    const port = await Port.create({
      userId: user.id,
      name: data.name,
      stealthMetaAddress: data.stealthMetaAddress,
      viewingKeyEncrypted: data.viewingKeyEncrypted,
      viewingKeyNonce: data.viewingKeyNonce,
      chainId: data.chainId ?? 5000, // Default to Mantle mainnet
    })

    return response.created({
      id: port.id,
      portId: port.portId,
      name: port.name,
      stealthMetaAddress: port.stealthMetaAddress,
      chainId: port.chainId,
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
      portId: port.portId,
      name: port.name,
      stealthMetaAddress: port.stealthMetaAddress,
      chainId: port.chainId,
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

    await port.save()

    return response.ok({
      id: port.id,
      portId: port.portId,
      name: port.name,
      stealthMetaAddress: port.stealthMetaAddress,
      chainId: port.chainId,
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
}
