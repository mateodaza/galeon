import { createWalletClient, createPublicClient, http, parseEther, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import env from '#start/env'
import ChainService from '#services/chain_service'

const RELAYER_PRIVATE_KEY = env.get('RELAYER_PRIVATE_KEY') as `0x${string}` | undefined
const LOW_BALANCE_THRESHOLD = parseEther('0.1')

// ERC20 Transfer function selector
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb'

export default class RelayerService {
  private static getAccount() {
    if (!RELAYER_PRIVATE_KEY) {
      throw new Error('RELAYER_PRIVATE_KEY not configured')
    }
    return privateKeyToAccount(RELAYER_PRIVATE_KEY)
  }

  /**
   * Get viem chain config for a chain ID using RPC from ChainService
   */
  private static getViemChain(chainId?: number) {
    const chain = ChainService.getChain(chainId ?? ChainService.getDefaultChainId())

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
   * Get wallet client for transactions
   */
  private static getWalletClient() {
    const chain = this.getViemChain()
    return createWalletClient({
      account: this.getAccount(),
      chain,
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Get public client for reads
   */
  private static getPublicClient() {
    const chain = this.getViemChain()
    return createPublicClient({
      chain,
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Create a wallet client from a stealth private key
   */
  private static getStealthWalletClient(stealthPrivateKey: Uint8Array) {
    const hexKey = ('0x' + Buffer.from(stealthPrivateKey).toString('hex')) as `0x${string}`
    const account = privateKeyToAccount(hexKey)
    const chain = this.getViemChain()

    return createWalletClient({
      account,
      chain,
      transport: http(ChainService.getDefaultChain().rpcUrl),
    })
  }

  /**
   * Get relayer wallet address
   */
  static getAddress(): string {
    return this.getAccount().address
  }

  /**
   * Check relayer balance
   */
  static async getBalance(): Promise<bigint> {
    const client = this.getPublicClient()
    return client.getBalance({ address: this.getAccount().address })
  }

  /**
   * Check if balance is below threshold
   */
  static async isLowBalance(): Promise<boolean> {
    const balance = await this.getBalance()
    return balance < LOW_BALANCE_THRESHOLD
  }

  /**
   * Get balance of a stealth address
   */
  static async getStealthBalance(stealthAddress: string): Promise<bigint> {
    const client = this.getPublicClient()
    return client.getBalance({ address: stealthAddress as `0x${string}` })
  }

  /**
   * Send native token from stealth address to recipient
   *
   * @param stealthPrivateKey - Private key for the stealth address
   * @param to - Recipient address
   * @param value - Amount in wei
   * @returns Transaction hash
   */
  static async sendFromStealth(
    stealthPrivateKey: Uint8Array,
    to: string,
    value: bigint
  ): Promise<string> {
    const client = this.getStealthWalletClient(stealthPrivateKey)
    const publicClient = this.getPublicClient()

    // Estimate gas for the transfer
    const gasEstimate = await publicClient.estimateGas({
      account: client.account,
      to: to as `0x${string}`,
      value,
    })

    // Get current gas price
    const gasPrice = await publicClient.getGasPrice()

    // Calculate gas cost
    const gasCost = gasEstimate * gasPrice

    // Ensure we have enough to cover gas
    const stealthBalance = await publicClient.getBalance({ address: client.account.address })
    if (stealthBalance < value + gasCost) {
      // Adjust value to account for gas
      const adjustedValue = stealthBalance - gasCost
      if (adjustedValue <= 0) {
        throw new Error('Insufficient balance to cover gas costs')
      }
      value = adjustedValue
    }

    // Send transaction
    const hash = await client.sendTransaction({
      to: to as `0x${string}`,
      value,
      gas: gasEstimate,
    })

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    return hash
  }

  /**
   * Send ERC20 token from stealth address to recipient
   *
   * @param stealthPrivateKey - Private key for the stealth address
   * @param tokenAddress - ERC20 token contract address
   * @param to - Recipient address
   * @param amount - Token amount (in token's smallest unit)
   * @returns Transaction hash
   */
  static async sendTokenFromStealth(
    stealthPrivateKey: Uint8Array,
    tokenAddress: string,
    to: string,
    amount: bigint
  ): Promise<string> {
    const client = this.getStealthWalletClient(stealthPrivateKey)
    const publicClient = this.getPublicClient()

    // Encode transfer function call: transfer(address to, uint256 amount)
    const toAddressPadded = to.slice(2).toLowerCase().padStart(64, '0')
    const amountPadded = amount.toString(16).padStart(64, '0')
    const data = `${ERC20_TRANSFER_SELECTOR}${toAddressPadded}${amountPadded}` as `0x${string}`

    // Estimate gas
    const gasEstimate = await publicClient.estimateGas({
      account: client.account,
      to: tokenAddress as `0x${string}`,
      data,
    })

    // Send transaction
    const hash = await client.sendTransaction({
      to: tokenAddress as `0x${string}`,
      data,
      gas: gasEstimate,
    })

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash })

    return hash
  }

  /**
   * Check if relayer is properly configured
   */
  static isConfigured(): boolean {
    return !!RELAYER_PRIVATE_KEY
  }

  /**
   * Get relayer status including balance and configuration
   */
  static async getStatus(): Promise<{
    configured: boolean
    address: string | null
    balance: string | null
    isLowBalance: boolean
    chainId: number
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        address: null,
        balance: null,
        isLowBalance: true,
        chainId: ChainService.getDefaultChainId(),
      }
    }

    const balance = await this.getBalance()
    const isLow = balance < LOW_BALANCE_THRESHOLD

    return {
      configured: true,
      address: this.getAddress(),
      balance: balance.toString(),
      isLowBalance: isLow,
      chainId: ChainService.getDefaultChainId(),
    }
  }
}
