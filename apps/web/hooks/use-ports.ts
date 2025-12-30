'use client'

/**
 * React hook for Port management.
 *
 * Reads ports from PortRegistered events (temporary until backend is ready).
 * Provides functions for creating and managing ports.
 *
 * TODO [BACKEND_SWAP]: Replace event reading with backend API calls
 * - usePorts() queryFn: fetch('/api/ports?owner=${address}')
 * - Port creation stays on-chain, but can notify backend after tx confirms
 */

import { useMemo } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { useQuery } from '@tanstack/react-query'
import { keccak256, toHex, encodePacked } from 'viem'
import { galeonRegistryAbi, CONTRACTS } from '@/lib/contracts'
import { derivePortKeys, formatStealthMetaAddress } from '@galeon/stealth'
import { useStealthContext } from '@/contexts/stealth-context'

/** Port data structure */
export interface Port {
  portId: `0x${string}`
  name: string
  stealthMetaAddress: string
  owner: `0x${string}`
  isActive: boolean
  createdAt?: bigint
}

/**
 * Hook for reading user's ports from chain events.
 *
 * This is a temporary solution until the backend/Ponder is ready.
 * Reads PortRegistered events filtered by the connected wallet.
 */
export function usePorts() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()

  const contractAddress = useMemo(() => {
    if (!chainId) return null
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
    return contracts?.galeonRegistry ?? null
  }, [chainId])

  const {
    data: ports,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['ports', address, chainId],
    queryFn: async (): Promise<Port[]> => {
      if (!publicClient || !address || !contractAddress) {
        return []
      }

      // ============================================================
      // TODO [BACKEND_SWAP]: Replace this block with:
      // const res = await fetch(`/api/ports?owner=${address}&chainId=${chainId}`)
      // return res.json()
      // ============================================================

      // Start from deployment block (first block before all Galeon contracts)
      const deploymentBlock = 89365202n
      const CHUNK_SIZE = 40000n // Stay under 50k limit for WalletConnect RPC
      const latestBlock = await publicClient.getBlockNumber()

      type PortRegisteredLog = {
        args: {
          owner: `0x${string}`
          portId: `0x${string}`
          name: string
          stealthMetaAddress: `0x${string}`
        }
        blockNumber: bigint
      }

      type PortDeactivatedLog = {
        args: {
          owner: `0x${string}`
          portId: `0x${string}`
        }
      }

      const portRegisteredEvent = {
        type: 'event' as const,
        name: 'PortRegistered' as const,
        inputs: [
          { name: 'owner', type: 'address', indexed: true },
          { name: 'portId', type: 'bytes32', indexed: true },
          { name: 'name', type: 'string', indexed: false },
          { name: 'stealthMetaAddress', type: 'bytes', indexed: false },
        ],
      } as const

      const portDeactivatedEvent = {
        type: 'event' as const,
        name: 'PortDeactivated' as const,
        inputs: [
          { name: 'owner', type: 'address', indexed: true },
          { name: 'portId', type: 'bytes32', indexed: true },
        ],
      } as const

      // Fetch logs in chunks to avoid RPC block range limits
      const allPortLogs: PortRegisteredLog[] = []
      const allDeactivationLogs: PortDeactivatedLog[] = []

      let fromBlock = deploymentBlock
      while (fromBlock <= latestBlock) {
        const toBlock = fromBlock + CHUNK_SIZE > latestBlock ? latestBlock : fromBlock + CHUNK_SIZE

        const [portLogs, deactivationLogs] = await Promise.all([
          publicClient.getLogs({
            address: contractAddress,
            event: portRegisteredEvent,
            args: { owner: address },
            fromBlock,
            toBlock,
          }),
          publicClient.getLogs({
            address: contractAddress,
            event: portDeactivatedEvent,
            args: { owner: address },
            fromBlock,
            toBlock,
          }),
        ])

        allPortLogs.push(...(portLogs as unknown as PortRegisteredLog[]))
        allDeactivationLogs.push(...(deactivationLogs as unknown as PortDeactivatedLog[]))
        fromBlock = toBlock + 1n
      }

      const logs = allPortLogs
      const deactivationLogs = allDeactivationLogs

      // Build set of deactivated port IDs
      const deactivatedPorts = new Set(deactivationLogs.map((log) => log.args.portId))

      // Map logs to Port objects
      return logs.map((log) => {
        const args = log.args

        // Decode stealth meta-address bytes to string format
        const metaAddressBytes = args.stealthMetaAddress
        const formatted = decodeMetaAddress(metaAddressBytes)

        return {
          portId: args.portId,
          name: args.name,
          stealthMetaAddress: formatted,
          owner: args.owner,
          isActive: !deactivatedPorts.has(args.portId),
          createdAt: log.blockNumber,
        }
      })
    },
    enabled: !!publicClient && !!address && !!contractAddress,
    staleTime: 30_000, // 30 seconds
  })

  return {
    ports: ports ?? [],
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook for creating a new port.
 * Uses per-port key derivation for cryptographic isolation.
 */
export function useCreatePort() {
  const { chainId } = useAccount()
  const { masterSignature } = useStealthContext()
  const { ports, refetch } = usePorts()

  const contractAddress = useMemo(() => {
    if (!chainId) return null
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
    return contracts?.galeonRegistry ?? null
  }, [chainId])

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const createPort = async (name: string) => {
    if (!contractAddress) {
      throw new Error('Contract not available on this chain')
    }

    if (!masterSignature) {
      throw new Error('Keys not derived - please unlock first')
    }

    // Use current port count as the index for deterministic key derivation
    // This ensures each port gets unique, reproducible keys
    const portIndex = ports.length

    // Derive port-specific keys using master signature + port index
    const portKeys = derivePortKeys(masterSignature, portIndex)

    // Generate unique port ID from name + random
    const random = crypto.getRandomValues(new Uint8Array(16))
    const portId = keccak256(encodePacked(['string', 'bytes'], [name, toHex(random)]))

    // Format stealth meta-address as bytes (66 bytes = spending + viewing pubkeys)
    const metaAddressBytes = encodeMetaAddress(
      portKeys.spendingPublicKey,
      portKeys.viewingPublicKey
    )

    writeContract({
      address: contractAddress,
      abi: galeonRegistryAbi,
      functionName: 'registerPort',
      args: [portId, name, metaAddressBytes],
    })

    return portId
  }

  // Refetch ports when transaction is confirmed
  if (isSuccess) {
    refetch()
  }

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
