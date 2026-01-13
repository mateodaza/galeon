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

    const query = Receipt.query()
      .whereIn('portId', portIds)
      .whereNotNull('amount')
      .whereNot('amount', '0') // Filter out 0-value receipts (ghost registrations)
      .orderBy('createdAt', 'desc')

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
   * POST /receipts/mark-collected
   * Mark receipts as collected (called by frontend after pool deposit or wallet collect)
   * Updates receipt status and port totals
   */
  async markCollected({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { stealthAddresses } = request.body() as { stealthAddresses: string[] }

    console.log('[markCollected] Request received:', { userId: user.id, stealthAddresses })

    if (!Array.isArray(stealthAddresses) || stealthAddresses.length === 0) {
      return response.badRequest({ error: 'stealthAddresses array required' })
    }

    // Normalize addresses to lowercase for case-insensitive matching
    const normalizedAddresses = stealthAddresses.map((a) => a.toLowerCase())
    console.log('[markCollected] Normalized addresses:', normalizedAddresses)

    // Get user's port IDs
    const userPorts = await Port.query().where('userId', user.id).select('id')
    const portIds = userPorts.map((p) => p.id)
    console.log('[markCollected] User port IDs:', portIds)

    if (portIds.length === 0) {
      console.log('[markCollected] No ports found for user')
      return response.ok({ updated: 0 })
    }

    // Find confirmed receipts matching the stealth addresses (case-insensitive)
    const receipts = await Receipt.query()
      .whereIn('portId', portIds)
      .whereRaw('LOWER(stealth_address) IN (?)', [normalizedAddresses])
      .where('status', 'confirmed')
      .preload('port')

    console.log(
      '[markCollected] Found receipts:',
      receipts.length,
      receipts.map((r) => ({
        id: r.id,
        stealthAddress: r.stealthAddress,
        status: r.status,
        amount: r.amount,
      }))
    )

    let updatedCount = 0
    const portUpdates = new Map<string, bigint>()

    for (const receipt of receipts) {
      receipt.status = 'collected'
      await receipt.save()
      updatedCount++

      // Track amount to add to port's totalCollected
      const amount = BigInt(receipt.amount ?? '0')
      const currentTotal = portUpdates.get(receipt.portId) ?? BigInt(0)
      portUpdates.set(receipt.portId, currentTotal + amount)
    }

    // Update port totals
    for (const [portId, additionalCollected] of portUpdates) {
      const port = await Port.find(portId)
      if (port) {
        port.totalCollected = (BigInt(port.totalCollected ?? '0') + additionalCollected).toString()
        await port.save()
      }
    }

    return response.ok({ updated: updatedCount })
  }

  /**
   * POST /receipts/recalculate-totals
   * Force recalculate port totals from receipts.
   * Only counts confirmed receipts as received, collected receipts as collected.
   * Does NOT auto-mark receipts - use markCollected for that.
   * Call this if totals are out of sync.
   */
  async recalculateTotals({ auth, response }: HttpContext) {
    const user = auth.user!

    // Get user's ports
    const ports = await Port.query().where('userId', user.id)

    let updatedPorts = 0

    for (const port of ports) {
      // Get all receipts for this port (exclude 0-value ghost registrations)
      const receipts = await Receipt.query()
        .where('portId', port.id)
        .whereIn('status', ['confirmed', 'collected'])
        .whereNotNull('amount')
        .whereNot('amount', '0')

      let totalReceived = BigInt(0)
      let totalCollected = BigInt(0)

      console.log(
        `[recalculateTotals] Port ${port.name} (${port.id}): found ${receipts.length} receipts`
      )
      for (const receipt of receipts) {
        const amount = BigInt(receipt.amount ?? '0')
        totalReceived += amount

        // Only count as collected if status is 'collected'
        // Don't auto-mark confirmed as collected - that should only happen
        // when the user actually collects/sweeps the funds
        if (receipt.status === 'collected') {
          totalCollected += amount
        }
      }

      const oldReceived = port.totalReceived
      const oldCollected = port.totalCollected

      port.totalReceived = totalReceived.toString()
      port.totalCollected = totalCollected.toString()
      port.paymentCount = receipts.length
      await port.save()

      if (oldReceived !== port.totalReceived || oldCollected !== port.totalCollected) {
        updatedPorts++
        console.log(`[recalculateTotals] Updated port ${port.id}:`, {
          totalReceived: `${oldReceived} -> ${port.totalReceived}`,
          totalCollected: `${oldCollected} -> ${port.totalCollected}`,
        })
      }
    }

    return response.ok({
      message: 'Port totals recalculated from receipts',
      portsChecked: ports.length,
      portsUpdated: updatedPorts,
    })
  }

  /**
   * GET /receipts/by-stealth/:address
   * Public lookup - find receipt by stealth address
   */
  async showByStealthAddress({ params, response }: HttpContext) {
    const { address } = params

    const receipt = await Receipt.query()
      .whereRaw('LOWER(stealth_address) = ?', [address.toLowerCase()])
      .preload('port')
      .first()

    if (!receipt) {
      return response.notFound({
        error: 'Receipt not found',
      })
    }

    // Only return confirmed/collected receipts (not pending or failed)
    if (receipt.status === 'pending' || receipt.status === 'failed') {
      return response.notFound({
        error: 'Receipt not found or not yet confirmed',
      })
    }

    // Return just the receipt ID for linking
    return response.ok({
      id: receipt.id,
      status: receipt.status,
    })
  }

  /**
   * GET /receipts/public/:id
   * Public receipt verification - anyone can verify a payment
   */
  async showPublic({ params, response }: HttpContext) {
    const { id } = params

    const receipt = await Receipt.query().where('id', id).preload('port').first()

    if (!receipt) {
      return response.notFound({
        error: 'Receipt not found',
      })
    }

    // Only show confirmed/collected receipts publicly (not pending or failed)
    if (receipt.status === 'pending' || receipt.status === 'failed') {
      return response.notFound({
        error: 'Receipt not found or not yet confirmed',
      })
    }

    // Mask payer address for private payments (stealth_pay and private_send)
    // Only regular payments show the actual sender address
    const paymentType = receipt.paymentType ?? 'regular'
    const payerAddress = paymentType === 'regular' ? receipt.payerAddress : null

    // Return limited public data (no sensitive info)
    return response.ok({
      id: receipt.id,
      receiptHash: receipt.receiptHash,
      portName: receipt.port?.name || 'Anonymous Port',
      stealthAddress: receipt.stealthAddress,
      amount: receipt.amount,
      currency: receipt.currency,
      tokenAddress: receipt.tokenAddress,
      paymentType,
      payerAddress, // null for stealth_pay/private_send
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      txHash: receipt.txHash,
      chainId: receipt.chainId,
      createdAt: receipt.createdAt,
      // Verification data - only true for confirmed/collected (failed already excluded above)
      verified: true,
      verifiedAt: new Date().toISOString(),
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
