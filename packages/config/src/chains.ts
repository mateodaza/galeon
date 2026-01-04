/**
 * Chain configuration for Galeon.
 *
 * Centralized chain definitions with RPC URLs and explorer links.
 */

import { mantle, mantleSepoliaTestnet, type Chain } from 'viem/chains'

/** Supported chain IDs */
export const SUPPORTED_CHAIN_IDS = [5000, 5003] as const
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number]

/** Default chain for the app */
export const DEFAULT_CHAIN_ID: SupportedChainId = 5000

/** Chain definitions by ID */
export const CHAINS: Record<SupportedChainId, Chain> = {
  5000: mantle,
  5003: mantleSepoliaTestnet,
}

/** RPC URLs by chain ID (use env override when available) */
export const RPC_URLS: Record<SupportedChainId, string> = {
  5000: 'https://rpc.mantle.xyz',
  5003: 'https://rpc.sepolia.mantle.xyz',
}

/** Block explorer URLs */
export const EXPLORER_URLS: Record<SupportedChainId, string> = {
  5000: 'https://mantlescan.xyz',
  5003: 'https://sepolia.mantlescan.xyz',
}

/** Chain names for display */
export const CHAIN_NAMES: Record<SupportedChainId, string> = {
  5000: 'Mantle',
  5003: 'Mantle Sepolia',
}

/**
 * Get the Chain object for a chain ID.
 */
export function getChain(chainId: SupportedChainId): Chain {
  return CHAINS[chainId]
}

/**
 * Get RPC URL for a chain, with optional env override.
 */
export function getRpcUrl(chainId: SupportedChainId, envOverride?: string): string {
  return envOverride || RPC_URLS[chainId]
}

/**
 * Get explorer URL for a transaction.
 */
export function getTxExplorerUrl(chainId: SupportedChainId, txHash: string): string {
  return `${EXPLORER_URLS[chainId]}/tx/${txHash}`
}

/**
 * Get explorer URL for an address.
 */
export function getAddressExplorerUrl(chainId: SupportedChainId, address: string): string {
  return `${EXPLORER_URLS[chainId]}/address/${address}`
}

/**
 * Check if a chain ID is supported.
 */
export function isSupportedChain(chainId: number): chainId is SupportedChainId {
  return SUPPORTED_CHAIN_IDS.includes(chainId as SupportedChainId)
}
