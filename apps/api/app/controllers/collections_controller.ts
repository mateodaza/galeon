import type { HttpContext } from '@adonisjs/core/http'
import Collection from '#models/collection'
import Port from '#models/port'
import Receipt from '#models/receipt'
import {
  initiateCollectionValidator,
  executeCollectionValidator,
  getCollectionValidator,
  listCollectionsValidator,
} from '#validators/collect'

export default class CollectionsController {
  /**
   * GET /collections
   * List collections for the authenticated user
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { page = 1, limit = 20, status } = await listCollectionsValidator.validate(request.qs())

    const query = Collection.query().where('userId', user.id).orderBy('createdAt', 'desc')

    if (status) {
      query.where('status', status)
    }

    const collections = await query.paginate(page, limit)

    return response.ok({
      data: collections.all().map((collection) => ({
        id: collection.id,
        status: collection.status,
        recipientAddress: collection.recipientAddress,
        totalAmount: collection.totalAmount,
        tokenAmounts: collection.tokenAmounts,
        totalReceipts: collection.totalReceipts,
        processedReceipts: collection.processedReceipts,
        txHash: collection.txHash,
        errorMessage: collection.errorMessage,
        createdAt: collection.createdAt,
      })),
      meta: {
        total: collections.total,
        perPage: collections.perPage,
        currentPage: collections.currentPage,
        lastPage: collections.lastPage,
      },
    })
  }

  /**
   * POST /collections
   * Initiate a new collection (scan for claimable receipts)
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { portIds, recipientAddress } = await initiateCollectionValidator.validate(request.body())

    // Verify all ports belong to user
    const ports = await Port.query().whereIn('id', portIds).where('userId', user.id)

    if (ports.length !== portIds.length) {
      return response.notFound({
        error: 'One or more ports not found',
      })
    }

    // Get confirmed receipts for these ports
    const receipts = await Receipt.query()
      .whereIn('portId', portIds)
      .where('status', 'confirmed')
      .whereNull('collectionId')

    if (receipts.length === 0) {
      return response.badRequest({
        error: 'No claimable receipts found',
      })
    }

    // Create collection record
    const collection = await Collection.create({
      userId: user.id,
      status: 'pending',
      recipientAddress: recipientAddress.toLowerCase(),
      totalReceipts: receipts.length,
      processedReceipts: 0,
      totalAmount: '0',
      tokenAmounts: {},
    })

    return response.created({
      id: collection.id,
      status: collection.status,
      recipientAddress: collection.recipientAddress,
      totalReceipts: collection.totalReceipts,
      claimableReceipts: receipts.map((r) => ({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        tokenAddress: r.tokenAddress,
      })),
      createdAt: collection.createdAt,
    })
  }

  /**
   * GET /collections/:id
   * Get a single collection with details
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = await getCollectionValidator.validate(params)

    const collection = await Collection.query()
      .where('id', id)
      .where('userId', user.id)
      .preload('receipts')
      .first()

    if (!collection) {
      return response.notFound({
        error: 'Collection not found',
      })
    }

    return response.ok({
      id: collection.id,
      status: collection.status,
      recipientAddress: collection.recipientAddress,
      totalAmount: collection.totalAmount,
      tokenAmounts: collection.tokenAmounts,
      totalReceipts: collection.totalReceipts,
      processedReceipts: collection.processedReceipts,
      txHash: collection.txHash,
      errorMessage: collection.errorMessage,
      receipts: collection.receipts.map((r) => ({
        id: r.id,
        amount: r.amount,
        currency: r.currency,
        status: r.status,
      })),
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    })
  }

  /**
   * POST /collections/:id/execute
   * Execute collection with spending key signature
   */
  async execute({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { id } = await getCollectionValidator.validate(params)
    const { receiptIds, spendingSignature } = await executeCollectionValidator.validate(
      request.body()
    )

    const collection = await Collection.query().where('id', id).where('userId', user.id).first()

    if (!collection) {
      return response.notFound({
        error: 'Collection not found',
      })
    }

    if (collection.status !== 'pending') {
      return response.badRequest({
        error: `Collection is already ${collection.status}`,
      })
    }

    // Verify receipts belong to user's ports and are claimable
    const userPorts = await Port.query().where('userId', user.id).select('id')
    const portIds = userPorts.map((p) => p.id)

    const receipts = await Receipt.query()
      .whereIn('id', receiptIds)
      .whereIn('portId', portIds)
      .where('status', 'confirmed')

    if (receipts.length !== receiptIds.length) {
      return response.badRequest({
        error: 'One or more receipts are not claimable',
      })
    }

    // Update collection status
    collection.status = 'processing'
    await collection.save()

    // TODO: Queue the actual collection job
    // For now, return the collection with processing status
    // The job system will handle the actual on-chain collection

    return response.ok({
      id: collection.id,
      status: collection.status,
      message: 'Collection is being processed',
      receiptsToProcess: receiptIds.length,
      spendingSignature: spendingSignature.slice(0, 10) + '...', // Partial for confirmation
    })
  }
}
