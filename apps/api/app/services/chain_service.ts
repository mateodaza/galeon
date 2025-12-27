import env from '#start/env'

export interface ChainConfig {
  chainId: number
  name: string
  rpcUrl: string
  explorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

// Default RPC URLs (can be overridden by environment)
const DEFAULT_RPC_URLS: Record<number, string> = {
  5003: 'https://rpc.sepolia.mantle.xyz',
  5000: 'https://rpc.mantle.xyz',
}

// Supported chains
const CHAINS: Record<number, Omit<ChainConfig, 'rpcUrl'>> = {
  // Mantle Sepolia (Testnet)
  5003: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    explorer: 'https://sepolia.mantlescan.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  },
  // Mantle Mainnet
  5000: {
    chainId: 5000,
    name: 'Mantle',
    explorer: 'https://mantlescan.xyz',
    nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
  },
}

// Allowed chain IDs from environment
const ALLOWED_CHAIN_IDS = env
  .get('ALLOWED_CHAIN_IDS', '5003,5000')
  .split(',')
  .map((id) => Number.parseInt(id.trim(), 10))
  .filter((id) => !Number.isNaN(id))

// Default chain ID from environment
const DEFAULT_CHAIN_ID = env.get('CHAIN_ID', 5003)

// RPC URL from environment (used for default chain)
const RPC_URL = env.get('RPC_URL')

export default class ChainService {
  /**
   * Get RPC URL for a chain, using environment override if available
   */
  private static getRpcUrl(chainId: number): string {
    // Use env RPC_URL for default chain, otherwise use defaults
    if (chainId === DEFAULT_CHAIN_ID && RPC_URL) {
      return RPC_URL
    }
    return DEFAULT_RPC_URLS[chainId] || ''
  }

  /**
   * Get the default chain configuration
   */
  static getDefaultChain(): ChainConfig {
    const baseConfig = CHAINS[DEFAULT_CHAIN_ID]
    if (!baseConfig) {
      throw new Error(`Default chain ${DEFAULT_CHAIN_ID} not configured`)
    }
    return {
      ...baseConfig,
      rpcUrl: this.getRpcUrl(DEFAULT_CHAIN_ID),
    }
  }

  /**
   * Get chain configuration by ID
   */
  static getChain(chainId: number): ChainConfig {
    const baseConfig = CHAINS[chainId]
    if (!baseConfig) {
      throw new Error(`Chain ${chainId} not supported`)
    }
    return {
      ...baseConfig,
      rpcUrl: this.getRpcUrl(chainId),
    }
  }

  /**
   * Check if a chain ID is allowed
   */
  static isAllowedChain(chainId: number): boolean {
    return ALLOWED_CHAIN_IDS.includes(chainId)
  }

  /**
   * Get all allowed chain IDs
   */
  static getAllowedChainIds(): number[] {
    return ALLOWED_CHAIN_IDS
  }

  /**
   * Get the default chain ID
   */
  static getDefaultChainId(): number {
    return DEFAULT_CHAIN_ID
  }

  /**
   * Get all supported chains (that are also allowed)
   */
  static getAllowedChains(): ChainConfig[] {
    return ALLOWED_CHAIN_IDS.map((id) => {
      const baseConfig = CHAINS[id]
      if (!baseConfig) return null
      return {
        ...baseConfig,
        rpcUrl: this.getRpcUrl(id),
      }
    }).filter((chain): chain is ChainConfig => chain !== null)
  }
}
