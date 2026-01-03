import type { HttpContext } from '@adonisjs/core/http'
import Receipt from '#models/receipt'
import Port from '#models/port'
import {
  listReceiptsValidator,
  getReceiptValidator,
  createReceiptValidator,
} from '#validators/receipt'

export default class ReceiptsController {
  /**
   * GET /receipts
   * List receipts for the authenticated user's ports
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const {
      portId,
      status,
      page = 1,
      limit = 20,
    } = await listReceiptsValidator.validate(request.qs())

    // Get user's port IDs
    const userPorts = await Port.query().where('userId', user.id).select('id')
    const portIds = userPorts.map((p) => p.id)

    if (portIds.length === 0) {
      return response.ok({
        data: [],
        meta: { total: 0, perPage: limit, currentPage: page, lastPage: 1 },
      })
    }

    const query = Receipt.query().whereIn('portId', portIds).orderBy('createdAt', 'desc')

    // Filter by specific port if provided
    if (portId) {
      // Verify port belongs to user
      if (!portIds.includes(portId)) {
        return response.notFound({ error: 'Port not found' })
      }
      query.where('portId', portId)
    }

    // Filter by status if provided
    if (status) {
      query.where('status', status)
    }

    const receipts = await query.preload('port').paginate(page, limit)

    return response.ok({
      data: receipts.all().map((receipt) => ({
        id: receipt.id,
        receiptHash: receipt.receiptHash,
        portId: receipt.portId,
        portName: receipt.port?.name,
        stealthAddress: receipt.stealthAddress,
        amount: receipt.amount,
        currency: receipt.currency,
        tokenAddress: receipt.tokenAddress,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        createdAt: receipt.createdAt,
      })),
      meta: {
        total: receipts.total,
        perPage: receipts.perPage,
        currentPage: receipts.currentPage,
        lastPage: receipts.lastPage,
      },
    })
  }

  /**
   * POST /receipts
   * Create a pending receipt after frontend makes on-chain donation
   * The cronjob will verify and fill in data from Ponder indexer
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { transactionHash, portId, chainId } = await createReceiptValidator.validate(
      request.body()
    )

    // Verify the port belongs to the user
    const port = await Port.query().where('id', portId).where('userId', user.id).first()

    if (!port) {
      return response.notFound({ error: 'Port not found' })
    }

    // Validate chainId matches port's chainId
    if (chainId !== port.chainId) {
      return response.badRequest({
        error: `Chain ID mismatch: receipt is for chain ${chainId} but port is configured for chain ${port.chainId}`,
      })
    }

    // Check if receipt with this (txHash, chainId) already exists
    const existingReceipt = await Receipt.query()
      .where('txHash', transactionHash)
      .where('chainId', chainId)
      .first()

    if (existingReceipt) {
      return response.conflict({ error: 'Receipt with this transaction hash already exists' })
    }

    // Create pending receipt with minimal data
    // Cronjob will fill in: stealthAddress, ephemeralPubKey, viewTag, amount, etc.
    const receipt = await Receipt.create({
      portId: port.id,
      txHash: transactionHash,
      chainId,
      status: 'pending',
      // Placeholder values - will be filled by verify job
      receiptHash: '',
      stealthAddress: '',
      ephemeralPubKey: '',
      viewTag: 0,
      payerAddress: '',
      amount: '0',
      currency: chainId === 5000 ? 'MNT' : 'ETH', // Default to native token
      blockNumber: '0',
    })

    return response.created({
      id: receipt.id,
      txHash: receipt.txHash,
      portId: receipt.portId,
      chainId: receipt.chainId,
      status: receipt.status,
      createdAt: receipt.createdAt,
    })
  }

  /**
   * GET /receipts/:id
   * Get a single receipt
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = await getReceiptValidator.validate(params)

    // Get user's port IDs
    const userPorts = await Port.query().where('userId', user.id).select('id')
    const portIds = userPorts.map((p) => p.id)

    const receipt = await Receipt.query()
      .where('id', id)
      .whereIn('portId', portIds)
      .preload('port')
      .first()

    if (!receipt) {
      return response.notFound({
        error: 'Receipt not found',
      })
    }

    return response.ok({
      id: receipt.id,
      receiptHash: receipt.receiptHash,
      portId: receipt.portId,
      portName: receipt.port?.name,
      stealthAddress: receipt.stealthAddress,
      ephemeralPubKey: receipt.ephemeralPubKey,
      viewTag: receipt.viewTag,
      amount: receipt.amount,
      currency: receipt.currency,
      tokenAddress: receipt.tokenAddress,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      txHash: receipt.txHash,
      collectionId: receipt.collectionId,
      createdAt: receipt.createdAt,
      updatedAt: receipt.updatedAt,
    })
  }

  /**
   * GET /receipts/stats
   * Get receipt statistics for the user
   */
  async stats({ auth, response }: HttpContext) {
    const user = auth.user!

    // Get user's port IDs
    const userPorts = await Port.query().where('userId', user.id).select('id')
    const portIds = userPorts.map((p) => p.id)

    if (portIds.length === 0) {
      return response.ok({
        totalReceipts: 0,
        pendingReceipts: 0,
        confirmedReceipts: 0,
        collectedReceipts: 0,
        totalPending: '0',
        totalConfirmed: '0',
        totalCollected: '0',
      })
    }

    const receipts = await Receipt.query().whereIn('portId', portIds)

    let totalPending = BigInt(0)
    let totalConfirmed = BigInt(0)
    let totalCollected = BigInt(0)
    let pendingCount = 0
    let confirmedCount = 0
    let collectedCount = 0

    for (const receipt of receipts) {
      const amount = BigInt(receipt.amount ?? '0')
      switch (receipt.status) {
        case 'pending':
          totalPending += amount
          pendingCount++
          break
        case 'confirmed':
          totalConfirmed += amount
          confirmedCount++
          break
        case 'collected':
          totalCollected += amount
          collectedCount++
          break
      }
    }

    return response.ok({
      totalReceipts: receipts.length,
      pendingReceipts: pendingCount,
      confirmedReceipts: confirmedCount,
      collectedReceipts: collectedCount,
      totalPending: totalPending.toString(),
      totalConfirmed: totalConfirmed.toString(),
      totalCollected: totalCollected.toString(),
    })
  }
}
