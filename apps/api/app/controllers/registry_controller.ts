import type { HttpContext } from '@adonisjs/core/http'
import { isSupportedChain, type SupportedChainId } from '@galeon/config'
import RegistryService from '#services/registry_service'

export default class RegistryController {
  /**
   * POST /registry/verified-balances
   * Get verified balances for multiple stealth addresses.
   *
   * Request body:
   * - addresses: Array of stealth addresses to check
   * - chainId: Chain ID (optional, default: 5000)
   * - asset: Asset address (optional, default: native token)
   */
  async verifiedBalances({ request, response }: HttpContext) {
    const { addresses, chainId, asset } = request.body()

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
      return response.badRequest({ error: 'addresses array is required' })
    }

    // Limit to 50 addresses per request to avoid timeout
    if (addresses.length > 50) {
      return response.badRequest({ error: 'Maximum 50 addresses per request' })
    }

    // Validate chainId if provided
    let validChainId: SupportedChainId | undefined
    if (chainId !== undefined) {
      const numChainId = Number(chainId)
      if (!isSupportedChain(numChainId)) {
        return response.badRequest({ error: `Unsupported chain: ${chainId}` })
      }
      validChainId = numChainId
    }

    try {
      const registryService = new RegistryService()
      const results = await registryService.getVerifiedBalances(
        addresses as string[],
        validChainId,
        asset as string | undefined
      )

      return response.ok({
        data: results,
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('not deployed')) {
        return response.badRequest({ error: error.message })
      }
      throw error
    }
  }
}
