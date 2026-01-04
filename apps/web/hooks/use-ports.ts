'use client'

/**
 * React hook for Port management.
 *
 * Reads ports from backend API.
 * Creates ports via two-step flow:
 * 1. Create port in backend → get UUID
 * 2. Derive keys using UUID hash as seed
 * 3. Update port with stealth keys
 * 4. Send on-chain tx → wait for receipt → confirm
 */

import { useMemo, useState, useCallback } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { keccak256, toHex, encodePacked, stringToBytes } from 'viem'
import { galeonRegistryAbi, isSupportedChain, getStealthContracts } from '@/lib/contracts'
import { derivePortKeys, formatStealthMetaAddress } from '@galeon/stealth'
import { useStealthContext } from '@/contexts/stealth-context'
import { portsApi, type PortResponse, type PortStatus } from '@/lib/api'

/** Port data structure (combines backend + derived data) */
export interface Port {
  id: string // Backend UUID
  portId: `0x${string}` | null // On-chain portId (indexerPortId)
  name: string
  stealthMetaAddress: string | null
  owner?: `0x${string}`
  isActive: boolean
  status: PortStatus
  txHash: string | null
  createdAt?: string
}

/**
 * Convert UUID to a deterministic 32-bit number for key derivation.
 * Uses first 4 bytes of keccak256 hash.
 */
function uuidToPortIndex(uuid: string): number {
  const hash = keccak256(stringToBytes(uuid))
  return parseInt(hash.slice(2, 10), 16)
}

/**
 * Hook for reading user's ports from backend API.
 */
export function usePorts() {
  const queryClient = useQueryClient()

  const {
    data: portsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ports'],
    queryFn: async (): Promise<Port[]> => {
      const response = await portsApi.list()
      return response.data.map((port) => mapPortResponse(port))
    },
    staleTime: 30_000, // 30 seconds
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ports'] })
  }, [queryClient])

  return {
    ports: portsData ?? [],
    isLoading,
    error,
    refetch,
    invalidate,
  }
}

/**
 * Hook for creating a new port.
 *
 * Two-step flow to avoid key reuse:
 * 1. Create port in backend → get UUID
 * 2. Derive keys using UUID hash as portIndex seed
 * 3. Update port with stealth keys
 * 4. Send on-chain tx → wait for receipt → confirm
 */
export function useCreatePort() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { masterSignature } = useStealthContext()
  const { invalidate } = usePorts()
  const queryClient = useQueryClient()

  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [hash, setHash] = useState<`0x${string}` | undefined>()
  const [error, setError] = useState<Error | null>(null)

  const contractAddress = useMemo(() => {
    if (!chainId || !isSupportedChain(chainId)) return null
    return getStealthContracts(chainId).galeonRegistry
  }, [chainId])

  const { writeContractAsync } = useWriteContract()

  const createPort = async (name: string) => {
    if (!contractAddress) {
      throw new Error('Contract not available on this chain')
    }

    if (!masterSignature) {
      throw new Error('Keys not derived - please unlock first')
    }

    if (!address) {
      throw new Error('Wallet not connected')
    }

    if (!publicClient) {
      throw new Error('Public client not available')
    }

    // Reset state
    setError(null)
    setIsSuccess(false)
    setHash(undefined)
    setIsPending(true)

    try {
      // Step 1: Create port in backend (just name) → get UUID
      const backendPort = await portsApi.create({ name, chainId })

      // Step 2: Derive keys using UUID hash as portIndex (prevents key reuse)
      const portIndex = uuidToPortIndex(backendPort.id)
      const portKeys = derivePortKeys(masterSignature, portIndex)

      // Format stealth meta-address as string for backend
      const stealthMetaAddress = formatStealthMetaAddress(
        portKeys.spendingPublicKey,
        portKeys.viewingPublicKey,
        'mnt'
      )

      // Get viewing key as hex for backend storage
      const viewingKey = toHex(portKeys.viewingPrivateKey)

      // Step 3: Update port with stealth keys
      await portsApi.update(backendPort.id, { stealthMetaAddress, viewingKey })

      // Optimistically add to cache
      queryClient.setQueryData<Port[]>(['ports'], (old) => {
        const newPort: Port = {
          id: backendPort.id,
          portId: null,
          name: backendPort.name,
          stealthMetaAddress,
          isActive: true,
          status: 'pending',
          txHash: null,
          createdAt: backendPort.createdAt,
        }
        return old ? [newPort, ...old] : [newPort]
      })

      // Step 4: Generate on-chain portId and send transaction
      const random = crypto.getRandomValues(new Uint8Array(16))
      const onChainPortId = keccak256(encodePacked(['string', 'bytes'], [name, toHex(random)]))

      // Format stealth meta-address as bytes for chain (66 bytes = spending + viewing pubkeys)
      const metaAddressBytes = encodeMetaAddress(
        portKeys.spendingPublicKey,
        portKeys.viewingPublicKey
      )

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: galeonRegistryAbi,
        functionName: 'registerPort',
        args: [onChainPortId, name, metaAddressBytes],
      })

      setHash(txHash)
      setIsPending(false)
      setIsConfirming(true)

      // Step 5: Wait for transaction receipt
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      // Step 6: Update backend with confirmed status and on-chain portId
      try {
        await portsApi.update(backendPort.id, {
          txHash,
          status: 'confirmed',
          indexerPortId: onChainPortId,
        })
      } catch (updateErr) {
        console.error('First update attempt failed, retrying...', updateErr)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await portsApi.update(backendPort.id, {
          txHash,
          status: 'confirmed',
          indexerPortId: onChainPortId,
        })
      }

      setIsConfirming(false)
      setIsSuccess(true)
      invalidate()

      return backendPort.id
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create port')
      setError(error)
      setIsPending(false)
      setIsConfirming(false)
      throw error
    }
  }

  const reset = useCallback(() => {
    setIsPending(false)
    setIsConfirming(false)
    setIsSuccess(false)
    setHash(undefined)
    setError(null)
  }, [])

  return {
    createPort,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  }
}

/**
 * Map backend PortResponse to frontend Port interface
 */
function mapPortResponse(port: PortResponse): Port {
  return {
    id: port.id,
    portId: port.indexerPortId as `0x${string}` | null,
    name: port.name,
    stealthMetaAddress: port.stealthMetaAddress,
    isActive: !port.archived,
    status: port.status,
    txHash: port.txHash,
    createdAt: port.createdAt,
  }
}

/**
 * Encode spending and viewing public keys to bytes.
 * Returns 66 bytes = spending pubkey (33) + viewing pubkey (33)
 */
function encodeMetaAddress(spendingPubKey: Uint8Array, viewingPubKey: Uint8Array): `0x${string}` {
  const combined = new Uint8Array(66)
  combined.set(spendingPubKey, 0)
  combined.set(viewingPubKey, 33)
  return toHex(combined)
}
