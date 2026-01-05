/**
 * Pool Relay Service
 *
 * Handles privacy pool withdrawal relay requests.
 * Users submit proofs, relayer broadcasts transactions for privacy.
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
  encodeFunctionData,
  type Address,
  type Hex,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import env from '#start/env'
import ChainService from '#services/chain_service'

// ============================================================
// Types
// ============================================================

export interface WithdrawalProof {
  pA: [bigint, bigint]
  pB: [[bigint, bigint], [bigint, bigint]]
  pC: [bigint, bigint]
  pubSignals: [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint]
}

export interface Withdrawal {
  processooor: Address
  data: Hex
}

export interface RelayRequest {
  chainId: number
  scope: string
  withdrawal: Withdrawal
  proof: WithdrawalProof
}

export interface QuoteRequest {
  chainId: number
  amount: string
  asset: string
  recipient?: string
}

export interface QuoteResponse {
  baseFeeBPS: number
  feeBPS: number
  feeRecipient: string
  estimatedGas: string
  gasPrice: string
}

export interface RelayResponse {
  success: boolean
  txHash?: string
  error?: string
  requestId: string
  timestamp: number
}

// ============================================================
// Configuration
// ============================================================

// Relayer configuration
const RELAYER_PRIVATE_KEY = env.get('RELAYER_PRIVATE_KEY') as `0x${string}` | undefined
const RELAYER_FEE_BPS = Number.parseInt(env.get('RELAYER_FEE_BPS') || '100') // Default 1%
const MIN_WITHDRAW_AMOUNT = BigInt(env.get('MIN_WITHDRAW_AMOUNT') || '10000000000000000') // 0.01 MNT
const MAX_GAS_PRICE = BigInt(env.get('MAX_GAS_PRICE') || '100000000000') // 100 gwei

// Entrypoint ABI (minimal for relay function)
const ENTRYPOINT_ABI = [
  {
    type: 'function',
    name: 'relay',
    inputs: [
      {
        name: '_withdrawal',
        type: 'tuple',
        components: [
          { name: 'processooor', type: 'address' },
          { name: 'data', type: 'bytes' },
        ],
      },
      {
        name: '_proof',
        type: 'tuple',
        components: [
          { name: 'pA', type: 'uint256[2]' },
          { name: 'pB', type: 'uint256[2][2]' },
          { name: 'pC', type: 'uint256[2]' },
          { name: 'pubSignals', type: 'uint256[8]' },
        ],
      },
      { name: '_scope', type: 'uint256' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const

// Native asset address (for fee calculations)
const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

// Contract addresses per chain
const ENTRYPOINT_ADDRESSES: Record<number, Address> = {
  5000: '0x8633518fbbf23E78586F1456530c3452885efb21', // Mantle Mainnet
}

// ============================================================
// Service
// ============================================================

export default class PoolRelayService {
  /**
   * Get relayer account
   */
  private static getAccount() {
    if (!RELAYER_PRIVATE_KEY) {
      throw new Error('RELAYER_PRIVATE_KEY not configured')
    }
    return privateKeyToAccount(RELAYER_PRIVATE_KEY)
  }

  /**
   * Get viem chain config
   */
  private static getViemChain(chainId: number) {
    const chain = ChainService.getChain(chainId)
    return defineChain({
      id: chain.chainId,
      name: chain.name,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [chain.rpcUrl] },
      },
      blockExplorers: {
        default: { name: `${chain.name} Explorer`, url: chain.explorer },
      },
      testnet: chain.chainId === 5003,
    })
  }

  /**
   * Get public client for reads
   */
  private static getPublicClient(chainId: number) {
    const chain = this.getViemChain(chainId)
    return createPublicClient({
      chain,
      transport: http(ChainService.getChain(chainId).rpcUrl),
    })
  }

  /**
   * Get wallet client for transactions
   */
  private static getWalletClient(chainId: number) {
    const account = this.getAccount()
    const chain = this.getViemChain(chainId)
    return createWalletClient({
      account,
      chain,
      transport: http(ChainService.getChain(chainId).rpcUrl),
    })
  }

  /**
   * Check if relayer is configured
   */
  static isConfigured(): boolean {
    return !!RELAYER_PRIVATE_KEY
  }

  /**
   * Get relayer address
   */
  static getAddress(): Address {
    return this.getAccount().address
  }

  /**
   * Get relayer balance
   */
  static async getBalance(chainId: number): Promise<bigint> {
    const client = this.getPublicClient(chainId)
    return client.getBalance({ address: this.getAccount().address })
  }

  /**
   * Get entrypoint address for chain
   */
  static getEntrypointAddress(chainId: number): Address {
    const address = ENTRYPOINT_ADDRESSES[chainId]
    if (!address) {
      throw new Error(`No entrypoint configured for chain ${chainId}`)
    }
    return address
  }

  /**
   * Get fee quote for a withdrawal
   */
  static async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const { chainId, amount } = request
    const publicClient = this.getPublicClient(chainId)

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice()

    // Estimate gas for relay transaction (~1.5M for ZK verification)
    const estimatedGas = 1_500_000n

    // Calculate gas cost
    const gasCost = gasPrice * estimatedGas

    // Calculate dynamic fee BPS to cover gas + profit margin
    const withdrawAmount = BigInt(amount)
    const baseFeeBPS = RELAYER_FEE_BPS
    const gasFeeBPS = withdrawAmount > 0n ? Number((gasCost * 10000n) / withdrawAmount) : 0

    // Total fee = base profit margin + gas coverage
    const totalFeeBPS = baseFeeBPS + gasFeeBPS

    return {
      baseFeeBPS,
      feeBPS: totalFeeBPS,
      feeRecipient: this.getAddress(),
      estimatedGas: estimatedGas.toString(),
      gasPrice: gasPrice.toString(),
    }
  }

  /**
   * Get relayer details
   */
  static async getDetails(chainId: number, assetAddress?: string) {
    const publicClient = this.getPublicClient(chainId)
    const gasPrice = await publicClient.getGasPrice()

    return {
      chainId,
      feeBPS: RELAYER_FEE_BPS,
      minWithdrawAmount: MIN_WITHDRAW_AMOUNT.toString(),
      feeReceiverAddress: this.getAddress(),
      assetAddress: assetAddress || NATIVE_ASSET,
      maxGasPrice: MAX_GAS_PRICE.toString(),
      currentGasPrice: gasPrice.toString(),
    }
  }

  /**
   * Validate a relay request
   */
  static async validateRequest(request: RelayRequest): Promise<{ valid: boolean; error?: string }> {
    const { chainId, withdrawal, proof } = request
    // Note: scope validation can be added later to verify it's a known pool

    // Check chain is supported
    const entrypoint = ENTRYPOINT_ADDRESSES[chainId]
    if (!entrypoint) {
      return { valid: false, error: `Chain ${chainId} not supported` }
    }

    // Check processooor matches entrypoint
    if (withdrawal.processooor.toLowerCase() !== entrypoint.toLowerCase()) {
      return {
        valid: false,
        error: `Invalid processooor: expected ${entrypoint}, got ${withdrawal.processooor}`,
      }
    }

    // Check withdrawn amount from public signals (index 2)
    const withdrawnValue = proof.pubSignals[2]
    if (withdrawnValue === 0n) {
      return { valid: false, error: 'Withdrawn amount cannot be zero' }
    }

    if (withdrawnValue < MIN_WITHDRAW_AMOUNT) {
      return {
        valid: false,
        error: `Withdrawn amount ${withdrawnValue} below minimum ${MIN_WITHDRAW_AMOUNT}`,
      }
    }

    // Decode relay data to check fee recipient
    try {
      const decoded = decodeRelayData(withdrawal.data)
      const feeRecipient = decoded.feeRecipient.toLowerCase()
      const relayerAddress = this.getAddress().toLowerCase()

      if (feeRecipient !== relayerAddress) {
        return {
          valid: false,
          error: `Fee recipient ${feeRecipient} doesn't match relayer ${relayerAddress}`,
        }
      }

      // Check fee BPS is sufficient
      const quote = await this.getQuote({
        chainId,
        amount: withdrawnValue.toString(),
        asset: NATIVE_ASSET,
      })

      if (decoded.relayFeeBPS < quote.feeBPS) {
        return {
          valid: false,
          error: `Fee BPS ${decoded.relayFeeBPS} below required ${quote.feeBPS}`,
        }
      }
    } catch (err) {
      return { valid: false, error: `Failed to decode relay data: ${err}` }
    }

    // Check gas price
    const publicClient = this.getPublicClient(chainId)
    const gasPrice = await publicClient.getGasPrice()
    if (gasPrice > MAX_GAS_PRICE) {
      return {
        valid: false,
        error: `Gas price ${gasPrice} exceeds maximum ${MAX_GAS_PRICE}`,
      }
    }

    return { valid: true }
  }

  /**
   * Relay a withdrawal transaction
   */
  static async relay(request: RelayRequest): Promise<RelayResponse> {
    const requestId = crypto.randomUUID()
    const timestamp = Date.now()

    try {
      // Validate request
      const validation = await this.validateRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          requestId,
          timestamp,
        }
      }

      const { chainId, scope, withdrawal, proof } = request
      const entrypoint = this.getEntrypointAddress(chainId)
      const walletClient = this.getWalletClient(chainId)
      const publicClient = this.getPublicClient(chainId)

      // Encode function call
      const data = encodeFunctionData({
        abi: ENTRYPOINT_ABI,
        functionName: 'relay',
        args: [withdrawal, proof, BigInt(scope)],
      })

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account: walletClient.account,
        to: entrypoint,
        data,
      })

      // Add 20% buffer for safety
      const gasLimit = (gasEstimate * 120n) / 100n

      console.log(`[PoolRelay] Relaying withdrawal for ${request.scope}`)
      console.log(`[PoolRelay] Gas estimate: ${gasEstimate}, limit: ${gasLimit}`)

      // Send transaction
      const hash = await walletClient.sendTransaction({
        to: entrypoint,
        data,
        gas: gasLimit,
      })

      console.log(`[PoolRelay] Transaction sent: ${hash}`)

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      })

      if (receipt.status === 'reverted') {
        return {
          success: false,
          error: 'Transaction reverted',
          requestId,
          timestamp,
        }
      }

      console.log(`[PoolRelay] Transaction confirmed: ${hash}`)

      return {
        success: true,
        txHash: hash,
        requestId,
        timestamp,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error(`[PoolRelay] Relay failed:`, err)

      return {
        success: false,
        error: message,
        requestId,
        timestamp,
      }
    }
  }

  /**
   * Get relayer status
   */
  static async getStatus(chainId: number) {
    if (!this.isConfigured()) {
      return {
        configured: false,
        address: null,
        balance: null,
        chainId,
      }
    }

    const balance = await this.getBalance(chainId)
    const lowBalanceThreshold = BigInt('100000000000000000') // 0.1 MNT

    return {
      configured: true,
      address: this.getAddress(),
      balance: balance.toString(),
      isLowBalance: balance < lowBalanceThreshold,
      chainId,
    }
  }
}

// ============================================================
// Helpers
// ============================================================

/**
 * Decode relay data from withdrawal struct
 * RelayData: (address recipient, address feeRecipient, uint256 relayFeeBPS)
 */
function decodeRelayData(data: Hex): {
  recipient: Address
  feeRecipient: Address
  relayFeeBPS: number
} {
  // ABI decode: (address, address, uint256)
  // Skip first 4 bytes (function selector if present) or decode directly
  const cleanData = data.startsWith('0x') ? data.slice(2) : data

  // Each address is 32 bytes (padded), uint256 is 32 bytes
  // Total: 96 bytes = 192 hex chars
  if (cleanData.length < 192) {
    throw new Error(`Invalid relay data length: ${cleanData.length}`)
  }

  const recipient = ('0x' + cleanData.slice(24, 64)) as Address
  const feeRecipient = ('0x' + cleanData.slice(88, 128)) as Address
  const relayFeeBPS = Number.parseInt(cleanData.slice(128, 192), 16)

  return { recipient, feeRecipient, relayFeeBPS }
}
