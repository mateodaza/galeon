/**
 * Chain configuration for Galeon.
 *
 * Supports Mantle Sepolia (testnet) and Mantle Mainnet.
 * Contract addresses are updated after deployment.
 */

import type { ChainConfig, TokenConfig } from './types'

/** EIP-5564 scheme ID for secp256k1 with view tags */
export const SCHEME_ID = 1

/** Placeholder address for contracts not yet deployed */
const PLACEHOLDER_ADDRESS = '0x0000000000000000000000000000000000000000' as const

/**
 * Supported chain configurations.
 *
 * Contract addresses should be updated after deployment.
 */
export const chains: Record<number, ChainConfig> = {
  // Mantle Sepolia (Testnet) - Primary for hackathon
  5003: {
    chainId: 5003,
    name: 'Mantle Sepolia',
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorer: 'https://sepolia.mantlescan.xyz',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
    contracts: {
      announcer: PLACEHOLDER_ADDRESS, // TODO: Update after deployment
      registry: PLACEHOLDER_ADDRESS, // TODO: Update after deployment
      galeon: PLACEHOLDER_ADDRESS, // TODO: Update after deployment
    },
  },

  // Mantle Mainnet - For production
  5000: {
    chainId: 5000,
    name: 'Mantle',
    rpcUrl: 'https://rpc.mantle.xyz',
    explorer: 'https://mantlescan.xyz',
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
    contracts: {
      announcer: PLACEHOLDER_ADDRESS, // TODO: Update after deployment
      registry: PLACEHOLDER_ADDRESS, // TODO: Update after deployment
      galeon: PLACEHOLDER_ADDRESS, // TODO: Update after deployment
    },
  },
}

/**
 * Supported tokens per chain.
 */
export const supportedTokens: Record<number, TokenConfig[]> = {
  // Mantle Mainnet
  5000: [
    {
      address: '0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE',
      symbol: 'USDT',
      decimals: 6,
    },
    {
      address: '0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
      symbol: 'USDe',
      decimals: 18,
    },
  ],
  // Mantle Sepolia (testnet) - mock tokens or testnet faucet
  5003: [
    // TODO: Deploy mock tokens or use testnet faucet addresses
  ],
}

/**
 * Get chain configuration by chain ID.
 *
 * @param chainId - The chain ID to look up
 * @returns Chain configuration
 * @throws Error if chain is not supported
 */
export function getChainConfig(chainId: number): ChainConfig {
  const config = chains[chainId]
  if (!config) {
    const supported = Object.keys(chains).join(', ')
    throw new Error(`Unsupported chain: ${chainId}. Supported chains: ${supported}`)
  }
  return config
}

/**
 * Get contract addresses for a chain.
 *
 * @param chainId - The chain ID
 * @returns Contract addresses
 */
export function getContracts(chainId: number): ChainConfig['contracts'] {
  return getChainConfig(chainId).contracts
}

/**
 * Get supported tokens for a chain.
 *
 * @param chainId - The chain ID
 * @returns Array of supported tokens (empty if none configured)
 */
export function getSupportedTokens(chainId: number): TokenConfig[] {
  return supportedTokens[chainId] ?? []
}

/**
 * Find a token by address on a given chain.
 *
 * @param chainId - The chain ID
 * @param address - Token contract address
 * @returns Token configuration or undefined if not found
 */
export function getTokenByAddress(
  chainId: number,
  address: `0x${string}`
): TokenConfig | undefined {
  const tokens = getSupportedTokens(chainId)
  return tokens.find((t) => t.address.toLowerCase() === address.toLowerCase())
}

/**
 * Find a token by symbol on a given chain.
 *
 * @param chainId - The chain ID
 * @param symbol - Token symbol (e.g., "USDT", "USDC")
 * @returns Token configuration or undefined if not found
 */
export function getTokenBySymbol(chainId: number, symbol: string): TokenConfig | undefined {
  const tokens = getSupportedTokens(chainId)
  return tokens.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase())
}

/**
 * Check if a chain is supported.
 *
 * @param chainId - The chain ID to check
 * @returns True if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in chains
}

/**
 * Get the explorer URL for a transaction.
 *
 * @param chainId - The chain ID
 * @param txHash - Transaction hash
 * @returns Full explorer URL
 */
export function getExplorerTxUrl(chainId: number, txHash: string): string {
  const config = getChainConfig(chainId)
  return `${config.explorer}/tx/${txHash}`
}

/**
 * Get the explorer URL for an address.
 *
 * @param chainId - The chain ID
 * @param address - Ethereum address
 * @returns Full explorer URL
 */
export function getExplorerAddressUrl(chainId: number, address: string): string {
  const config = getChainConfig(chainId)
  return `${config.explorer}/address/${address}`
}

/**
 * Update contract addresses for a chain.
 *
 * Call this after deploying contracts to update the configuration.
 *
 * @param chainId - The chain ID
 * @param contracts - New contract addresses
 */
export function updateContractAddresses(
  chainId: number,
  contracts: Partial<ChainConfig['contracts']>
): void {
  const config = chains[chainId]
  if (!config) {
    throw new Error(`Cannot update contracts for unsupported chain: ${chainId}`)
  }

  if (contracts.announcer) config.contracts.announcer = contracts.announcer
  if (contracts.registry) config.contracts.registry = contracts.registry
  if (contracts.galeon) config.contracts.galeon = contracts.galeon
}
