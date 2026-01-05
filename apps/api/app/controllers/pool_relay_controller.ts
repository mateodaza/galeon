/**
 * Pool Relay Controller
 *
 * Handles privacy pool relay API endpoints.
 * Allows users to submit withdrawal proofs for relaying.
 */

import type { HttpContext } from '@adonisjs/core/http'
import PoolRelayService from '#services/pool_relay_service'
import type { Hex, Address } from 'viem'

export default class PoolRelayController {
  /**
   * GET /relayer/status
   * Get relayer status and configuration
   */
  async status({ request, response }: HttpContext) {
    const chainId = Number.parseInt(request.input('chainId', '5000'))

    if (!PoolRelayService.isConfigured()) {
      return response.serviceUnavailable({
        error: 'Relayer not configured',
        configured: false,
      })
    }

    try {
      const status = await PoolRelayService.getStatus(chainId)
      return response.ok(status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get status'
      return response.internalServerError({ error: message })
    }
  }

  /**
   * GET /relayer/details
   * Get relayer configuration for a chain/asset
   */
  async details({ request, response }: HttpContext) {
    const chainId = Number.parseInt(request.input('chainId', '5000'))
    const assetAddress = request.input('assetAddress')

    if (!PoolRelayService.isConfigured()) {
      return response.serviceUnavailable({
        error: 'Relayer not configured',
      })
    }

    try {
      const details = await PoolRelayService.getDetails(chainId, assetAddress)
      return response.ok(details)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get details'
      return response.internalServerError({ error: message })
    }
  }

  /**
   * POST /relayer/quote
   * Get a fee quote for a withdrawal
   */
  async quote({ request, response }: HttpContext) {
    const { chainId, amount, asset, recipient } = request.only([
      'chainId',
      'amount',
      'asset',
      'recipient',
    ])

    if (!chainId || !amount) {
      return response.badRequest({
        error: 'Missing required fields: chainId, amount',
      })
    }

    if (!PoolRelayService.isConfigured()) {
      return response.serviceUnavailable({
        error: 'Relayer not configured',
      })
    }

    try {
      const quote = await PoolRelayService.getQuote({
        chainId: Number.parseInt(chainId),
        amount: amount.toString(),
        asset: asset || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        recipient,
      })

      return response.ok(quote)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get quote'
      return response.internalServerError({ error: message })
    }
  }

  /**
   * POST /relayer/request
   * Submit a withdrawal relay request
   */
  async request({ request, response }: HttpContext) {
    const body = request.body()
    const { chainId, scope, withdrawal, proof } = body

    // Validate required fields
    if (!chainId || !scope || !withdrawal || !proof) {
      return response.badRequest({
        error: 'Missing required fields: chainId, scope, withdrawal, proof',
      })
    }

    if (!withdrawal.processooor || !withdrawal.data) {
      return response.badRequest({
        error: 'Invalid withdrawal: requires processooor and data',
      })
    }

    if (!proof.pA || !proof.pB || !proof.pC || !proof.pubSignals) {
      return response.badRequest({
        error: 'Invalid proof: requires pA, pB, pC, pubSignals',
      })
    }

    if (!PoolRelayService.isConfigured()) {
      return response.serviceUnavailable({
        error: 'Relayer not configured',
      })
    }

    try {
      // Convert proof values to bigints
      const formattedProof = {
        pA: [BigInt(proof.pA[0]), BigInt(proof.pA[1])] as [bigint, bigint],
        pB: [
          [BigInt(proof.pB[0][0]), BigInt(proof.pB[0][1])],
          [BigInt(proof.pB[1][0]), BigInt(proof.pB[1][1])],
        ] as [[bigint, bigint], [bigint, bigint]],
        pC: [BigInt(proof.pC[0]), BigInt(proof.pC[1])] as [bigint, bigint],
        pubSignals: proof.pubSignals.map((s: string | number | bigint) => BigInt(s)) as [
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
          bigint,
        ],
      }

      const result = await PoolRelayService.relay({
        chainId: Number.parseInt(chainId),
        scope: scope.toString(),
        withdrawal: {
          processooor: withdrawal.processooor as Address,
          data: withdrawal.data as Hex,
        },
        proof: formattedProof,
      })

      if (result.success) {
        return response.ok(result)
      } else {
        return response.badRequest(result)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Relay failed'
      console.error('[PoolRelayController] Request failed:', err)
      return response.internalServerError({
        success: false,
        error: message,
        requestId: crypto.randomUUID(),
        timestamp: Date.now(),
      })
    }
  }
}
