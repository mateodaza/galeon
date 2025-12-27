/**
 * Chain definitions for Reown AppKit.
 *
 * Uses viem's built-in chain definitions for better AppKit compatibility,
 * including balance fetching and chain registry integration.
 */

import { mantle as viemMantle, mantleSepoliaTestnet } from 'viem/chains'
import type { AppKitNetwork } from '@reown/appkit/networks'

/**
 * Mantle Mainnet - using viem's built-in definition for AppKit compatibility.
 * Extended with Galeon contract addresses.
 */
export const mantle = {
  ...viemMantle,
  // Ensure proper CAIP format for AppKit
  caipNetworkId: `eip155:${viemMantle.id}`,
  chainNamespace: 'eip155',
} as const satisfies AppKitNetwork

/**
 * Mantle Sepolia (testnet) - using viem's built-in definition.
 */
export const mantleSepolia = {
  ...mantleSepoliaTestnet,
  caipNetworkId: `eip155:${mantleSepoliaTestnet.id}`,
  chainNamespace: 'eip155',
} as const satisfies AppKitNetwork

/**
 * All supported chains.
 */
export const supportedChains = [mantle, mantleSepolia] as const

/**
 * Default chain for the application.
 */
export const defaultChain = mantle
