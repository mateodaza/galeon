'use client'

/**
 * React hook for making payments.
 *
 * Handles the full payment flow:
 * 1. Fetch Port's stealth meta-address
 * 2. Generate stealth address
 * 3. Submit payment to contract
 *
 * TODO [BACKEND_SWAP]: Port meta-address can be fetched from backend
 * - usePortMetaAddress(): fetch('/api/ports/${portId}') instead of contract read
 * - Payment submission stays on-chain (cannot be moved to backend)
 */

import { useMemo, useCallback } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, keccak256, toHex, encodePacked } from 'viem'
import { galeonRegistryAbi, CONTRACTS } from '@/lib/contracts'
import {
  generateStealthAddress,
  formatStealthMetaAddress,
  type StealthMetaAddress,
} from '@galeon/stealth'

/** Default chain for reading port data when wallet not connected */
const DEFAULT_CHAIN_ID = 5000 // Mantle Mainnet

/**
 * Hook for fetching a Port's stealth meta-address.
 * Uses default chain (Mantle) if wallet not connected, so payers can see the form.
 */
export function usePortMetaAddress(portId: `0x${string}` | undefined) {
  const { chainId: connectedChainId } = useAccount()

  // Use connected chain if available, otherwise default to Mantle mainnet
  const chainId = connectedChainId ?? DEFAULT_CHAIN_ID

  const contractAddress = useMemo(() => {
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
    return contracts?.galeonRegistry ?? null
  }, [chainId])

  const { data, isLoading, error } = useReadContract({
    address: contractAddress ?? undefined,
    abi: galeonRegistryAbi,
    functionName: 'getPortMetaAddress',
    args: portId ? [portId] : undefined,
    query: {
      enabled: !!portId && !!contractAddress,
      // Refresh port data periodically
      staleTime: 30_000,
    },
  })

  // Decode the bytes to a stealth meta-address string
  const metaAddress = useMemo(() => {
    if (!data || data === '0x') return null
    return decodeMetaAddress(data as `0x${string}`)
  }, [data])

  return {
    metaAddress,
    isLoading,
    error,
  }
}

/**
 * Hook for making a native currency payment.
 */
export function usePayNative() {
  const { chainId } = useAccount()

  const contractAddress = useMemo(() => {
    if (!chainId) return null
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
    return contracts?.galeonRegistry ?? null
  }, [chainId])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const payNative = useCallback(
    async (
      stealthMetaAddress: string,
      amountInEth: string,
      memo: string,
      portId: `0x${string}`
    ): Promise<`0x${string}`> => {
      if (!contractAddress) {
        throw new Error('Contract not available on this chain')
      }

      if (!portId) {
        throw new Error('Port ID is required for payments')
      }

      // Generate stealth address from meta-address
      const { stealthAddress, ephemeralPublicKey, viewTag } = generateStealthAddress(
        stealthMetaAddress as StealthMetaAddress
      )

      // Parse amount to wei
      const value = parseEther(amountInEth)

      // Create receipt hash from memo + amount + portId
      // This enables verification that a specific payment was made with specific parameters
      // Note: timestamp is added by the contract at transaction time
      const receiptHash = keccak256(
        encodePacked(['string', 'uint256', 'bytes32'], [memo || 'Galeon Payment', value, portId])
      )

      // Convert ephemeral public key to bytes
      const ephemeralPubKeyHex = toHex(ephemeralPublicKey)

      // Convert view tag to bytes1
      const viewTagBytes = `0x${viewTag.toString(16).padStart(2, '0')}` as `0x${string}`

      writeContract({
        address: contractAddress,
        abi: galeonRegistryAbi,
        functionName: 'payNative',
        args: [portId, stealthAddress, ephemeralPubKeyHex, viewTagBytes, receiptHash],
        value,
      })

      return stealthAddress
    },
    [contractAddress, writeContract]
  )

  return {
    payNative,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

/**
 * Decode stealth meta-address bytes to string format.
 * Bytes format: 66 bytes = spending pubkey (33) + viewing pubkey (33)
 */
function decodeMetaAddress(bytes: `0x${string}`): string {
  // Remove 0x prefix
  const hex = bytes.slice(2)

  if (hex.length !== 132) {
    // 66 bytes = 132 hex chars
    return `st:mnt:${bytes}` // fallback
  }

  const spendingPubKey = new Uint8Array(33)
  const viewingPubKey = new Uint8Array(33)

  for (let i = 0; i < 33; i++) {
    spendingPubKey[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
    viewingPubKey[i] = parseInt(hex.slice(66 + i * 2, 66 + i * 2 + 2), 16)
  }

  return formatStealthMetaAddress(spendingPubKey, viewingPubKey, 'mnt')
}
