import type { HttpContext } from '@adonisjs/core/http'
import PonderService from '#services/ponder_service'

export default class NullifiersController {
  /**
   * GET /nullifiers/:hex
   * Check if a nullifier has been spent and how.
   *
   * Path params:
   * - hex: The nullifier hash as hex string (with or without 0x prefix)
   *
   * Query params:
   * - chainId: Optional chain ID filter (number)
   *
   * Returns:
   * - spent: boolean
   * - spentBy: 'withdrawal' | 'merge' | null (indicates how it was spent)
   * - withdrawal: withdrawal record if spent via withdrawal
   * - mergeDeposit: merge deposit record if spent via merge
   */
  async show({ params, request, response, logger }: HttpContext) {
    const { hex } = params
    const { chainId } = request.qs()

    // Normalize the hex string (ensure 0x prefix)
    const normalizedHex = hex.startsWith('0x') ? hex.toLowerCase() : `0x${hex.toLowerCase()}`

    try {
      const ponderService = new PonderService()
      const parsedChainId = chainId !== undefined ? Number(chainId) : undefined

      // Check both withdrawals and merge deposits in parallel
      const [withdrawal, mergeDeposit] = await Promise.all([
        ponderService.findWithdrawalByNullifier(normalizedHex, parsedChainId),
        ponderService.findMergeDepositByNullifier(normalizedHex, parsedChainId),
      ])

      const spent = withdrawal !== null || mergeDeposit !== null
      const spentBy = withdrawal ? 'withdrawal' : mergeDeposit ? 'merge' : null

      return response.ok({
        spent,
        spentBy,
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
        mergeDeposit: mergeDeposit
          ? {
              id: mergeDeposit.id,
              pool: mergeDeposit.pool,
              depositor: mergeDeposit.depositor,
              depositValue: mergeDeposit.depositValue,
              existingNullifierHash: mergeDeposit.existingNullifierHash,
              newCommitment: mergeDeposit.newCommitment,
              blockNumber: mergeDeposit.blockNumber,
              blockTimestamp: mergeDeposit.blockTimestamp,
              transactionHash: mergeDeposit.transactionHash,
              chainId: mergeDeposit.chainId,
            }
          : null,
      })
    } catch (error) {
      // If table doesn't exist, return not spent (indexer not running)
      if (error instanceof Error && error.message.includes('does not exist')) {
        logger.warn('Pool tables do not exist - indexer may not be running')
        return response.ok({
          spent: false,
          spentBy: null,
          withdrawal: null,
          mergeDeposit: null,
        })
      }
      throw error
    }
  }
}
