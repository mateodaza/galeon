/**
 * Chain and network types.
 *
 * Defines supported chains, tokens, and contract addresses.
 */

/** Supported chain IDs */
export type SupportedChainId = 5003 | 5000 | 421614

/** Chain names for display */
export type ChainName = 'Mantle Sepolia' | 'Mantle' | 'Arbitrum Sepolia'

/**
 * Native currency configuration.
 */
export interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

/**
 * Contract addresses for a chain.
 */
export interface ContractAddresses {
  /** ERC-5564 Announcer contract */
  announcer: `0x${string}`
  /** ERC-6538 Registry contract */
  registry: `0x${string}`
  /** GaleonRegistry contract */
  galeon: `0x${string}`
}

/**
 * Full chain configuration.
 */
export interface ChainConfig {
  chainId: SupportedChainId
  name: ChainName
  rpcUrl: string
  explorer: string
  nativeCurrency: NativeCurrency
  contracts: ContractAddresses
}

/**
 * Token configuration for supported ERC-20s.
 */
export interface TokenConfig {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  /** Logo URL (optional) */
  logoUrl?: string
}

/**
 * Network status for health checks.
 */
export interface NetworkStatus {
  chainId: SupportedChainId
  connected: boolean
  blockNumber: number
  latency: number
}

/**
 * Transaction status.
 */
export type TxStatus = 'pending' | 'confirmed' | 'failed'

/**
 * Transaction receipt info.
 */
export interface TxReceipt {
  txHash: `0x${string}`
  status: TxStatus
  blockNumber: number
  gasUsed: string
  effectiveGasPrice: string
}
