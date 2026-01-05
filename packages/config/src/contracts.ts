/**
 * Contract addresses for Galeon.
 *
 * All contract addresses organized by chain ID for easy multi-chain support.
 */

import type { SupportedChainId } from './chains.js'

/** Stealth/Registry contract addresses */
export interface StealthContracts {
  /** GaleonRegistry - Main contract for payments and Port management */
  galeonRegistry: `0x${string}`
  /** ERC5564Announcer - Stealth payment announcements */
  announcer: `0x${string}`
  /** ERC6538Registry - Stealth meta-address registry */
  registry: `0x${string}`
}

/** Privacy Pool contract addresses */
export interface PoolContracts {
  /** GaleonEntrypoint - Deposit entry point */
  entrypoint: `0x${string}`
  /** GaleonPrivacyPoolSimple - Main pool contract */
  pool: `0x${string}`
  /** Withdrawal verifier */
  withdrawalVerifier: `0x${string}`
  /** Ragequit verifier */
  ragequitVerifier: `0x${string}`
  /** Merge deposit verifier (for O(1) withdrawals) */
  mergeDepositVerifier: `0x${string}`
}

/** All contracts for a chain */
export interface ChainContracts {
  stealth: StealthContracts
  pool: PoolContracts
}

/** Contract addresses by chain ID */
export const CONTRACTS: Record<SupportedChainId, ChainContracts> = {
  5000: {
    stealth: {
      galeonRegistry: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D',
      announcer: '0x8C04238c49e22EB687ad706bEe645698ccF41153',
      registry: '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22',
    },
    pool: {
      entrypoint: '0x8633518fbbf23E78586F1456530c3452885efb21',
      pool: '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0',
      withdrawalVerifier: '0x4894F811D370d987B55bE4e5eeA48588d6545a32',
      ragequitVerifier: '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803',
      mergeDepositVerifier: '0x05DB69e37b8c7509E9d97826249385682CE9b29d',
    },
  },
  5003: {
    stealth: {
      galeonRegistry: '0x0000000000000000000000000000000000000000',
      announcer: '0x0000000000000000000000000000000000000000',
      registry: '0x0000000000000000000000000000000000000000',
    },
    pool: {
      entrypoint: '0x0000000000000000000000000000000000000000',
      pool: '0x0000000000000000000000000000000000000000',
      withdrawalVerifier: '0x0000000000000000000000000000000000000000',
      ragequitVerifier: '0x0000000000000000000000000000000000000000',
      mergeDepositVerifier: '0x0000000000000000000000000000000000000000',
    },
  },
}

/**
 * Get all contracts for a chain.
 */
export function getContracts(chainId: SupportedChainId): ChainContracts {
  return CONTRACTS[chainId]
}

/**
 * Get stealth contracts for a chain.
 */
export function getStealthContracts(chainId: SupportedChainId): StealthContracts {
  return CONTRACTS[chainId].stealth
}

/**
 * Get pool contracts for a chain.
 */
export function getPoolContracts(chainId: SupportedChainId): PoolContracts {
  return CONTRACTS[chainId].pool
}

/** Native token address (zero address) */
export const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000' as const

/** Scheme ID for ERC-5564 stealth addresses */
export const SCHEME_ID = 1n
