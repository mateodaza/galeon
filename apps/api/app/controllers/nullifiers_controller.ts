import type { HttpContext } from '@adonisjs/core/http'
import PonderService from '#services/ponder_service'

export default class NullifiersController {
  /**
   * GET /nullifiers/:hex
   * Check if a nullifier has been spent.
   *
   * Path params:
   * - hex: The nullifier hash as hex string (with or without 0x prefix)
   *
   * Query params:
   * - chainId: Optional chain ID filter (number)
   *
   * Returns:
   * - spent: boolean
   * - withdrawal: withdrawal record if spent, null otherwise
   */
  async show({ params, request, response, logger }: HttpContext) {
    const { hex } = params
    const { chainId } = request.qs()

    // Normalize the hex string (ensure 0x prefix)
    const normalizedHex = hex.startsWith('0x') ? hex.toLowerCase() : `0x${hex.toLowerCase()}`

    try {
      const ponderService = new PonderService()
      const withdrawal = await ponderService.findWithdrawalByNullifier(
        normalizedHex,
        chainId !== undefined ? Number(chainId) : undefined
      )

      return response.ok({
        spent: withdrawal !== null,
        withdrawal: withdrawal
          ? {
              id: withdrawal.id,
              pool: withdrawal.pool,
              processooor: withdrawal.processooor,
              value: withdrawal.value,
              spentNullifier: withdrawal.spentNullifier,
              newCommitment: withdrawal.newCommitment,
              recipient: withdrawal.recipient,
              relayer: withdrawal.relayer,
              asset: withdrawal.asset,
              feeAmount: withdrawal.feeAmount,
              blockNumber: withdrawal.blockNumber,
              blockTimestamp: withdrawal.blockTimestamp,
              transactionHash: withdrawal.transactionHash,
              chainId: withdrawal.chainId,
            }
          : null,
      })
    } catch (error) {
      // If table doesn't exist, return not spent (indexer not running)
      if (error instanceof Error && error.message.includes('does not exist')) {
        logger.warn('Pool withdrawals table does not exist - indexer may not be running')
        return response.ok({
          spent: false,
          withdrawal: null,
        })
      }
      throw error
    }
  }
}
