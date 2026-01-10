import type { HttpContext } from '@adonisjs/core/http'
import SentPayment from '#models/sent_payment'
import { createSentPaymentValidator, listSentPaymentsValidator } from '#validators/sent_payment'

export default class SentPaymentsController {
  /**
   * GET /sent-payments
   * List sent payments for the authenticated user
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const {
      page = 1,
      limit = 20,
      source,
      status,
    } = await listSentPaymentsValidator.validate(request.qs())

    const query = SentPayment.query().where('userId', user.id).orderBy('createdAt', 'desc')

    if (source) {
      query.where('source', source)
    }

    if (status) {
      query.where('status', status)
    }

    const payments = await query.paginate(page, limit)

    return response.ok({
      data: payments.all().map((payment) => ({
        id: payment.id,
        txHash: payment.txHash,
        chainId: payment.chainId,
        recipientAddress: payment.recipientAddress,
        recipientPortName: payment.recipientPortName,
        amount: payment.amount,
        currency: payment.currency,
        tokenAddress: payment.tokenAddress,
        source: payment.source,
        memo: payment.memo,
        status: payment.status,
        blockNumber: payment.blockNumber,
        createdAt: payment.createdAt,
      })),
      meta: {
        total: payments.total,
        perPage: payments.perPage,
        currentPage: payments.currentPage,
        lastPage: payments.lastPage,
      },
    })
  }

  /**
   * POST /sent-payments
   * Record a new sent payment after frontend makes on-chain payment
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await createSentPaymentValidator.validate(request.body())

    // Check if payment with this (txHash, chainId) already exists
    const existing = await SentPayment.query()
      .where('txHash', data.txHash)
      .where('chainId', data.chainId)
      .first()

    if (existing) {
      return response.conflict({ error: 'Payment with this transaction hash already exists' })
    }

    const payment = await SentPayment.create({
      userId: user.id,
      txHash: data.txHash,
      chainId: data.chainId,
      recipientAddress: data.recipientAddress,
      recipientPortName: data.recipientPortName ?? null,
      amount: data.amount,
      currency: data.currency,
      tokenAddress: data.tokenAddress ?? null,
      source: data.source,
      memo: data.memo ?? null,
      // Start as pending - VerifySentPayments job will verify on-chain and update to confirmed
      status: 'pending',
      verificationAttempts: 0,
    })

    return response.created({
      id: payment.id,
      txHash: payment.txHash,
      chainId: payment.chainId,
      source: payment.source,
      status: payment.status,
      createdAt: payment.createdAt,
    })
  }

  /**
   * GET /sent-payments/:id
   * Get a single sent payment
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = params

    const payment = await SentPayment.query().where('id', id).where('userId', user.id).first()

    if (!payment) {
      return response.notFound({ error: 'Payment not found' })
    }

    return response.ok({
      id: payment.id,
      txHash: payment.txHash,
      chainId: payment.chainId,
      recipientAddress: payment.recipientAddress,
      recipientPortName: payment.recipientPortName,
      amount: payment.amount,
      currency: payment.currency,
      tokenAddress: payment.tokenAddress,
      source: payment.source,
      memo: payment.memo,
      status: payment.status,
      blockNumber: payment.blockNumber,
      verificationError: payment.verificationError,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    })
  }

  /**
   * GET /sent-payments/stats
   * Get sent payment statistics for the user
   */
  async stats({ auth, response }: HttpContext) {
    const user = auth.user!

    const payments = await SentPayment.query().where('userId', user.id)

    let totalSentWallet = BigInt(0)
    let totalSentPort = BigInt(0)
    let totalSentPool = BigInt(0)
    let walletCount = 0
    let portCount = 0
    let poolCount = 0

    for (const payment of payments) {
      if (payment.status !== 'confirmed') continue
      const amount = BigInt(payment.amount)

      switch (payment.source) {
        case 'wallet':
          totalSentWallet += amount
          walletCount++
          break
        case 'port':
          totalSentPort += amount
          portCount++
          break
        case 'pool':
          totalSentPool += amount
          poolCount++
          break
      }
    }

    return response.ok({
      totalPayments: payments.length,
      confirmedPayments: walletCount + portCount + poolCount,
      bySource: {
        wallet: { total: totalSentWallet.toString(), count: walletCount },
        port: { total: totalSentPort.toString(), count: portCount },
        pool: { total: totalSentPool.toString(), count: poolCount },
      },
      grandTotal: (totalSentWallet + totalSentPort + totalSentPool).toString(),
    })
  }
}
