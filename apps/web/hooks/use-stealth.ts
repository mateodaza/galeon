'use client'

/**
 * React hook for stealth address operations.
 *
 * Wraps @galeon/stealth for use in React components.
 * Handles key derivation and stealth address generation.
 */

import { useCallback, useState } from 'react'
import { useSignMessage, useAccount } from 'wagmi'
import {
  deriveStealthKeys,
  derivePortKeys,
  generateStealthAddress,
  parseStealthMetaAddress,
  type StealthKeys,
} from '@galeon/stealth'

/** Message for deriving stealth keys */
const KEY_DERIVATION_MESSAGE = `Galeon Key Derivation

This signature unlocks your stealth keys for this session.
It does NOT authorize any transactions.

Domain: galeon.xyz
Action: Derive stealth keys`

/**
 * Hook for stealth key derivation and address generation.
 */
export function useStealth() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [keys, setKeys] = useState<StealthKeys | null>(null)
  const [isDerivingKeys, setIsDerivingKeys] = useState(false)

  /**
   * Derive stealth keys from wallet signature.
   * Must be called before using other stealth operations.
   */
  const deriveKeys = useCallback(async () => {
    if (!address) {
      throw new Error('Wallet not connected')
    }

    setIsDerivingKeys(true)

    try {
      const signature = await signMessageAsync({
        message: KEY_DERIVATION_MESSAGE,
      })

      const derivedKeys = deriveStealthKeys(signature)
      setKeys(derivedKeys)
      return derivedKeys
    } finally {
      setIsDerivingKeys(false)
    }
  }, [address, signMessageAsync])

  /**
   * Derive keys for a specific Port.
   * Requires master keys to be derived first.
   */
  const derivePortKeysFromMaster = useCallback(
    async (portIndex: number) => {
      if (!address) {
        throw new Error('Wallet not connected')
      }

      const signature = await signMessageAsync({
        message: KEY_DERIVATION_MESSAGE,
      })

      return derivePortKeys(signature, portIndex)
    },
    [address, signMessageAsync]
  )

  /**
   * Generate a stealth address for payment.
   */
  const generateAddress = useCallback((stealthMetaAddress: string) => {
    if (!stealthMetaAddress.startsWith('st:')) {
      throw new Error('Invalid stealth meta-address format')
    }

    // Cast to the expected type (st:mnt: or st:eth:)
    return generateStealthAddress(stealthMetaAddress as `st:mnt:0x${string}`)
  }, [])

  /**
   * Parse a stealth meta-address to extract public keys.
   */
  const parseMetaAddress = useCallback((stealthMetaAddress: string) => {
    if (!stealthMetaAddress.startsWith('st:')) {
      throw new Error('Invalid stealth meta-address format')
    }

    // Cast to the expected type (st:mnt: or st:eth:)
    return parseStealthMetaAddress(stealthMetaAddress as `st:mnt:0x${string}`)
  }, [])

  return {
    keys,
    isDerivingKeys,
    deriveKeys,
    derivePortKeysFromMaster,
    generateAddress,
    parseMetaAddress,
    hasKeys: keys !== null,
  }
}
