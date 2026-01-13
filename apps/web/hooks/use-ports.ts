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
import { useAuth } from '@/contexts/auth-context'
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
  totalReceived: string // Total received in wei
  totalCollected: string // Total collected in wei
  paymentCount: number // Number of confirmed receipts
  archived: boolean
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
 * Only fetches when user is authenticated to prevent infinite retry loops.
 *
 * @param options.enablePolling - Enable automatic polling for real-time updates (default: false)
 * @param options.pollingInterval - Polling interval in ms (default: 15000 = 15 seconds)
 */
export function usePorts(options?: { enablePolling?: boolean; pollingInterval?: number }) {
  const { enablePolling = false, pollingInterval = 15_000 } = options ?? {}
  const queryClient = useQueryClient()
  const { isAuthenticated } = useAuth()

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
    staleTime: 15_000, // 15 seconds - shorter for faster updates
    enabled: isAuthenticated, // Only fetch when authenticated
    retry: false, // Don't retry auth-protected endpoints
    refetchInterval: enablePolling ? pollingInterval : false, // Poll for real-time updates
    refetchIntervalInBackground: false, // Don't poll when tab is not focused
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  })

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ports'] })
  }, [queryClient])

  // Force recalculate port totals from receipts (fixes out-of-sync totals)
  const recalculateTotals = useCallback(async () => {
    const { receiptsApi } = await import('@/lib/api')
    const result = await receiptsApi.recalculateTotals()
    // Refetch ports to get updated totals
    await refetch()
    return result
  }, [refetch])

  return {
    ports: portsData ?? [],
    isLoading,
    error,
    refetch,
    invalidate,
    recalculateTotals,
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
  const queryClient = useQueryClient()

  // Invalidate ports query directly instead of using usePorts hook
  // Using usePorts here would create an unnecessary query subscription
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ports'] })
  }, [queryClient])

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

    // Track state for cleanup on error
    let backendPortId: string | null = null
    let txWasSent = false

    try {
      // =================================================================
      // CRITICAL: Key derivation uses on-chain portId for recoverability
      // =================================================================
      // The on-chain portId is permanent and stored on the blockchain.
      // This means keys can ALWAYS be recovered by:
      //   1. Syncing ports from Ponder (gets indexerPortId from chain)
      //   2. Deriving keys from wallet signature + indexerPortId
      //
      // NEVER use backend UUID for key derivation - it's not recoverable!
      // =================================================================

      // Step 1: Generate on-chain portId FIRST (this is what we'll use for key derivation)
      const random = crypto.getRandomValues(new Uint8Array(16))
      const onChainPortId = keccak256(encodePacked(['string', 'bytes'], [name, toHex(random)]))

      // CRITICAL: Always use lowercase for consistent key derivation
      // keccak256 from viem already returns lowercase, but we normalize to be safe
      const normalizedPortId = onChainPortId.toLowerCase() as `0x${string}`
      console.log('[createPort] Generated portId:', {
        raw: onChainPortId,
        normalized: normalizedPortId,
        sameCase: onChainPortId === normalizedPortId,
      })

      // Step 2: Derive keys using on-chain portId (NOT backend UUID)
      const portIndex = uuidToPortIndex(normalizedPortId)
      const portKeys = derivePortKeys(masterSignature, portIndex)

      // Format stealth meta-address as string for backend
      const stealthMetaAddress = formatStealthMetaAddress(
        portKeys.spendingPublicKey,
        portKeys.viewingPublicKey,
        'mnt'
      )

      // Get viewing key as hex for backend storage
      const viewingKey = toHex(portKeys.viewingPrivateKey)

      // Step 3: Create port in backend with all data including indexerPortId
      const backendPort = await portsApi.create({ name, chainId })
      backendPortId = backendPort.id

      // Step 4: Update port with stealth keys and on-chain portId
      // Use normalized (lowercase) portId for consistent key derivation
      await portsApi.update(backendPort.id, {
        stealthMetaAddress,
        viewingKey,
        indexerPortId: normalizedPortId,
      })

      // Format stealth meta-address as bytes for chain (66 bytes = spending + viewing pubkeys)
      const metaAddressBytes = encodeMetaAddress(
        portKeys.spendingPublicKey,
        portKeys.viewingPublicKey
      )

      const txHash = await writeContractAsync({
        address: contractAddress,
        abi: galeonRegistryAbi,
        functionName: 'registerPort',
        args: [normalizedPortId, name, metaAddressBytes],
      })

      txWasSent = true
      setHash(txHash)
      setIsPending(false)
      setIsConfirming(true)

      // Optimistically add to cache now that tx is sent
      queryClient.setQueryData<Port[]>(['ports'], (old) => {
        const newPort: Port = {
          id: backendPort.id,
          portId: null,
          name: backendPort.name,
          stealthMetaAddress,
          isActive: true,
          status: 'pending',
          txHash,
          createdAt: backendPort.createdAt,
          totalReceived: '0',
          totalCollected: '0',
          paymentCount: 0,
          archived: false,
        }
        return old ? [newPort, ...old] : [newPort]
      })

      // Step 5: Wait for transaction receipt
      await publicClient.waitForTransactionReceipt({ hash: txHash })

      // Step 6: Update backend with confirmed status and on-chain portId
      try {
        await portsApi.update(backendPort.id, {
          txHash,
          status: 'confirmed',
          indexerPortId: normalizedPortId,
        })
      } catch (updateErr) {
        console.error('First update attempt failed, retrying...', updateErr)
        await new Promise((resolve) => setTimeout(resolve, 1000))
        await portsApi.update(backendPort.id, {
          txHash,
          status: 'confirmed',
          indexerPortId: normalizedPortId,
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

      // Clean up backend port only if tx was never sent (user rejected wallet prompt)
      // If tx was sent, keep the port - it might still confirm on-chain
      if (backendPortId && !txWasSent) {
        try {
          await portsApi.delete(backendPortId)
        } catch (cleanupErr) {
          console.error('Failed to cleanup backend port:', cleanupErr)
        }
      }

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
    totalReceived: port.totalReceived ?? '0',
    totalCollected: port.totalCollected ?? '0',
    paymentCount: port.paymentCount ?? 0,
    archived: port.archived,
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
