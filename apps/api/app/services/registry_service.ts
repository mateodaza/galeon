import { createPublicClient, http, type Address, type PublicClient } from 'viem'
import { mantle } from 'viem/chains'
import { getStealthContracts, galeonRegistryAbi, type SupportedChainId } from '@galeon/config'
import env from '#start/env'

/**
 * Verified balance info for a stealth address
 */
export interface VerifiedBalanceInfo {
  stealthAddress: string
  verifiedBalance: string
  canDeposit: boolean
}

/**
 * Service for querying GaleonRegistry contract data.
 * Makes RPC calls to fetch verified balances and deposit eligibility.
 */
export default class RegistryService {
  private client: PublicClient

  constructor() {
    const rpcUrl = env.get('RPC_URL') || 'https://rpc.mantle.xyz'
    this.client = createPublicClient({
      chain: mantle,
      transport: http(rpcUrl),
    })
  }

  /**
   * Get verified balance info for multiple stealth addresses.
   * Fetches verifiedBalance and canDeposit for each address in parallel.
   *
   * @param addresses - Array of stealth addresses to check
   * @param chainId - Chain ID (default: 5000 for Mantle mainnet)
   * @param asset - Asset address (default: native token = 0x0)
   */
  async getVerifiedBalances(
    addresses: string[],
    chainId: SupportedChainId = 5000,
    asset: string = '0x0000000000000000000000000000000000000000'
  ): Promise<VerifiedBalanceInfo[]> {
    const stealthContracts = getStealthContracts(chainId)
    const registryAddress = stealthContracts.galeonRegistry

    if (registryAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`GaleonRegistry not deployed on chain ${chainId}`)
    }

    // Fetch data for all addresses in parallel
    const results = await Promise.all(
      addresses.map(async (stealthAddress) => {
        try {
          const [verifiedBalance, canDeposit] = await Promise.all([
            this.client.readContract({
              address: registryAddress,
              abi: galeonRegistryAbi,
              functionName: 'verifiedBalance',
              args: [stealthAddress as Address, asset as Address],
            }),
            this.client.readContract({
              address: registryAddress,
              abi: galeonRegistryAbi,
              functionName: 'canDeposit',
              args: [stealthAddress as Address],
            }),
          ])

          return {
            stealthAddress: stealthAddress.toLowerCase(),
            verifiedBalance: verifiedBalance.toString(),
            canDeposit: canDeposit && verifiedBalance > 0n,
          }
        } catch (error) {
          // If contract call fails, return zero balance and not depositable
          console.error(`Failed to fetch verified balance for ${stealthAddress}:`, error)
          return {
            stealthAddress: stealthAddress.toLowerCase(),
            verifiedBalance: '0',
            canDeposit: false,
          }
        }
      })
    )

    return results
  }
}
