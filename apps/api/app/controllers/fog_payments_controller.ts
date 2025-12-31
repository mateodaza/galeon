import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import FogPayment from '#models/fog_payment'
import {
  scheduleFogPaymentValidator,
  fogPaymentIdValidator,
  listFogPaymentsValidator,
  cancelFogPaymentValidator,
  updateFundingValidator,
} from '#validators/fog_payment'

export default class FogPaymentsController {
  /**
   * GET /fog-payments
   * List all fog payments for the authenticated user
   */
  async index({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const { page = 1, limit = 20, status } = await listFogPaymentsValidator.validate(request.qs())

    const query = FogPayment.query().where('userId', user.id).orderBy('createdAt', 'desc')

    if (status) {
      query.where('status', status)
    }

    const payments = await query.paginate(page, limit)

    return response.ok({
      data: payments.all().map((p) => ({
        id: p.id,
        fogAddress: p.fogAddress,
        fogIndex: p.fogIndex,
        recipientStealthAddress: p.recipientStealthAddress,
        receiptHash: p.receiptHash,
        amount: p.amount,
        tokenAddress: p.tokenAddress,
        sendAt: p.sendAt,
        expiresAt: p.expiresAt,
        status: p.status,
        txHash: p.txHash,
        executedAt: p.executedAt,
        errorMessage: p.errorMessage,
        parentFogPaymentId: p.parentFogPaymentId,
        createdAt: p.createdAt,
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
   * POST /fog-payments
   * Schedule a new fog payment
   */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.user!
    const data = await scheduleFogPaymentValidator.validate(request.body())

    // Validate time bounds
    const now = DateTime.now()
    const sendAt = DateTime.fromJSDate(data.sendAt)
    const expiresAt = DateTime.fromJSDate(data.expiresAt)

    if (sendAt <= now) {
      return response.badRequest({
        error: 'sendAt must be in the future',
      })
    }

    if (expiresAt <= sendAt) {
      return response.badRequest({
        error: 'expiresAt must be after sendAt',
      })
    }

    // Create the fog payment record
    const fogPayment = await FogPayment.create({
      userId: user.id,
      fogAddress: data.fogAddress,
      fogIndex: data.fogIndex,
      fogKeysEncrypted: data.fogKeysEncrypted,
      fogKeysNonce: data.fogKeysNonce,
      recipientStealthAddress: data.recipientStealthAddress,
      recipientEphemeralPubKey: data.recipientEphemeralPubKey,
      recipientViewTag: data.recipientViewTag,
      receiptHash: data.receiptHash,
      amount: data.amount,
      tokenAddress: data.tokenAddress ?? null,
      sendAt,
      expiresAt,
      userSignature: data.userSignature,
      authorizationMessage: data.authorizationMessage,
      status: 'pending',
      // Optional funding info for hop chains
      fundingTxHash: data.fundingTxHash ?? null,
      fundingFrom: data.fundingFrom ?? null,
      fundingAmount: data.fundingAmount ?? null,
      parentFogPaymentId: data.parentFogPaymentId ?? null,
    })

    return response.created({
      id: fogPayment.id,
      fogAddress: fogPayment.fogAddress,
      fogIndex: fogPayment.fogIndex,
      recipientStealthAddress: fogPayment.recipientStealthAddress,
      receiptHash: fogPayment.receiptHash,
      amount: fogPayment.amount,
      tokenAddress: fogPayment.tokenAddress,
      sendAt: fogPayment.sendAt,
      expiresAt: fogPayment.expiresAt,
      status: fogPayment.status,
      parentFogPaymentId: fogPayment.parentFogPaymentId,
      createdAt: fogPayment.createdAt,
    })
  }

  /**
   * GET /fog-payments/:id
   * Get a single fog payment by ID
   */
  async show({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = await fogPaymentIdValidator.validate(params)

    const fogPayment = await FogPayment.query().where('id', id).where('userId', user.id).first()

    if (!fogPayment) {
      return response.notFound({
        error: 'Fog payment not found',
      })
    }

    return response.ok({
      id: fogPayment.id,
      fogAddress: fogPayment.fogAddress,
      fogIndex: fogPayment.fogIndex,
      fundingTxHash: fogPayment.fundingTxHash,
      fundingFrom: fogPayment.fundingFrom,
      fundingAmount: fogPayment.fundingAmount,
      fundedAt: fogPayment.fundedAt,
      parentFogPaymentId: fogPayment.parentFogPaymentId,
      recipientStealthAddress: fogPayment.recipientStealthAddress,
      recipientViewTag: fogPayment.recipientViewTag,
      receiptHash: fogPayment.receiptHash,
      amount: fogPayment.amount,
      tokenAddress: fogPayment.tokenAddress,
      sendAt: fogPayment.sendAt,
      expiresAt: fogPayment.expiresAt,
      status: fogPayment.status,
      txHash: fogPayment.txHash,
      executedAt: fogPayment.executedAt,
      errorMessage: fogPayment.errorMessage,
      createdAt: fogPayment.createdAt,
      updatedAt: fogPayment.updatedAt,
    })
  }

  /**
   * POST /fog-payments/:id/cancel
   * Cancel a pending fog payment
   */
  async cancel({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { id } = await fogPaymentIdValidator.validate(params)
    const { reason } = await cancelFogPaymentValidator.validate(request.body())

    const fogPayment = await FogPayment.query().where('id', id).where('userId', user.id).first()

    if (!fogPayment) {
      return response.notFound({
        error: 'Fog payment not found',
      })
    }

    if (fogPayment.status !== 'pending') {
      return response.badRequest({
        error: `Cannot cancel fog payment with status: ${fogPayment.status}`,
      })
    }

    fogPayment.status = 'cancelled'
    fogPayment.errorMessage = reason ?? 'Cancelled by user'
    await fogPayment.save()

    return response.ok({
      id: fogPayment.id,
      status: fogPayment.status,
      errorMessage: fogPayment.errorMessage,
    })
  }

  /**
   * PATCH /fog-payments/:id/funding
   * Update funding info after user funds the fog wallet
   */
  async updateFunding({ auth, params, request, response }: HttpContext) {
    const user = auth.user!
    const { id } = await fogPaymentIdValidator.validate(params)
    const data = await updateFundingValidator.validate(request.body())

    const fogPayment = await FogPayment.query().where('id', id).where('userId', user.id).first()

    if (!fogPayment) {
      return response.notFound({
        error: 'Fog payment not found',
      })
    }

    if (fogPayment.status !== 'pending') {
      return response.badRequest({
        error: `Cannot update funding for fog payment with status: ${fogPayment.status}`,
      })
    }

    fogPayment.fundingTxHash = data.fundingTxHash
    fogPayment.fundingFrom = data.fundingFrom
    fogPayment.fundingAmount = data.fundingAmount
    fogPayment.fundedAt = DateTime.now()
    await fogPayment.save()

    return response.ok({
      id: fogPayment.id,
      fundingTxHash: fogPayment.fundingTxHash,
      fundingFrom: fogPayment.fundingFrom,
      fundingAmount: fogPayment.fundingAmount,
      fundedAt: fogPayment.fundedAt,
    })
  }

  /**
   * GET /fog-payments/:id/hop-chain
   * Get the full hop chain for a fog payment (for Shipwreck compliance)
   */
  async hopChain({ auth, params, response }: HttpContext) {
    const user = auth.user!
    const { id } = await fogPaymentIdValidator.validate(params)

    const fogPayment = await FogPayment.query().where('id', id).where('userId', user.id).first()

    if (!fogPayment) {
      return response.notFound({
        error: 'Fog payment not found',
      })
    }

    // Trace back through parent chain
    const ancestors: Array<{
      id: string
      fogAddress: string
      fundingTxHash: string | null
      fundingFrom: string | null
      fundingAmount: string | null
    }> = []

    let current = fogPayment
    while (current.parentFogPaymentId) {
      const parent = await FogPayment.query()
        .where('id', current.parentFogPaymentId)
        .where('userId', user.id)
        .first()

      if (!parent) break

      ancestors.push({
        id: parent.id,
        fogAddress: parent.fogAddress,
        fundingTxHash: parent.fundingTxHash,
        fundingFrom: parent.fundingFrom,
        fundingAmount: parent.fundingAmount,
      })
      current = parent
    }

    // Get descendants (child hops)
    const descendants = await FogPayment.query()
      .where('parentFogPaymentId', id)
      .where('userId', user.id)

    return response.ok({
      payment: {
        id: fogPayment.id,
        fogAddress: fogPayment.fogAddress,
        fundingTxHash: fogPayment.fundingTxHash,
        fundingFrom: fogPayment.fundingFrom,
        fundingAmount: fogPayment.fundingAmount,
      },
      ancestors: ancestors.reverse(), // Oldest first
      descendants: descendants.map((d) => ({
        id: d.id,
        fogAddress: d.fogAddress,
        fundingTxHash: d.fundingTxHash,
        fundingFrom: d.fundingFrom,
        fundingAmount: d.fundingAmount,
      })),
      userId: user.id, // Confirms ownership for compliance
    })
  }
}
