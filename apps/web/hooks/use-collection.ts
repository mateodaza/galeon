'use client'

/**
 * React hook for collecting funds from stealth addresses.
 *
 * Handles the full collection flow:
 * 1. Scan Announcement events
 * 2. Filter for payments belonging to user
 * 3. Get balances of stealth addresses
 * 4. Sweep funds to main wallet
 *
 * TODO [BACKEND_SWAP]: Announcement fetching can be moved to backend
 * - scan(): fetch('/api/announcements?chainId=${chainId}') for raw events
 * - scanAnnouncements() crypto MUST stay client-side (uses private keys)
 * - Balance checks and sweeping stay client-side (need wallet signatures)
 */

import { useState, useCallback, useMemo } from 'react'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatEther, parseEther, type Hex, keccak256, stringToBytes } from 'viem'
import { useStealthContext } from '@/contexts/stealth-context'
import { scanAnnouncements, derivePortKeys, type Announcement } from '@galeon/stealth'
import { announcementsApi, portsApi } from '@/lib/api'

/**
 * Convert UUID to a deterministic 32-bit number for key derivation.
 * Uses first 4 bytes of keccak256 hash.
 */
function uuidToPortIndex(uuid: string): number {
  const hash = keccak256(stringToBytes(uuid))
  return parseInt(hash.slice(2, 10), 16)
}

/**
 * Minimum balance required to collect a payment on Mantle.
 * Mantle L2 requires ~0.0012 MNT for gas (L1 data costs).
 * We need gas + something meaningful to send, so ~0.002 MNT minimum.
 */
export const MINIMUM_COLLECTABLE_BALANCE = parseEther('0.002')

/** Payment that can be collected */
export interface CollectablePayment {
  stealthAddress: `0x${string}`
  stealthPrivateKey: Uint8Array
  balance: bigint
  balanceFormatted: string
  token: `0x${string}` | null
  receiptHash: `0x${string}`
  txHash: `0x${string}`
  blockNumber: bigint
}

/**
 * Hook for scanning and collecting payments.
 */
export function useCollection() {
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { keys, masterSignature } = useStealthContext()

  const [payments, setPayments] = useState<CollectablePayment[]>([])
  const [dustPayments, setDustPayments] = useState<CollectablePayment[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [collectError, setCollectError] = useState<string | null>(null)
  const [collectTxHashes, setCollectTxHashes] = useState<`0x${string}`[]>([])

  /**
   * Scan for payments belonging to the user.
   */
  const scan = useCallback(async () => {
    if (!publicClient || !keys || !masterSignature) {
      setScanError('Missing required context')
      return
    }

    setIsScanning(true)
    setScanError(null)

    try {
      // Fetch all announcements from backend (auto-paginates)
      const apiAnnouncements = await announcementsApi.list({
        chainId: chainId ?? 5000, // Default to Mantle mainnet
      })

      // Fetch user's Ports to get Port-specific keys
      const portsResponse = await portsApi.list({ limit: 100 })
      const userPorts = portsResponse.data

      // Convert API response to Announcement format for scanning
      const announcements: Announcement[] = apiAnnouncements.map((ann) => ({
        stealthAddress: ann.stealthAddress as `0x${string}`,
        ephemeralPubKey: hexToBytes(ann.ephemeralPubKey as `0x${string}`),
        metadata: hexToBytes(ann.metadata as `0x${string}`),
        txHash: ann.transactionHash as `0x${string}`,
        blockNumber: BigInt(ann.blockNumber),
      }))

      // Scan for payments across ALL user Ports
      // Each Port has its own derived keys, so we scan with each Port's keys
      const allScannedPayments: ReturnType<typeof scanAnnouncements> = []

      for (const port of userPorts) {
        const portIndex = uuidToPortIndex(port.id)
        const portKeys = derivePortKeys(masterSignature, portIndex)

        const portPayments = scanAnnouncements(
          announcements,
          portKeys.spendingPrivateKey,
          portKeys.viewingPrivateKey
        )
        allScannedPayments.push(...portPayments)
      }

      const scannedPayments = allScannedPayments

      // Get balances for each payment and separate into collectable vs dust
      const collectablePayments: CollectablePayment[] = []
      const dustPaymentsList: CollectablePayment[] = []

      for (const payment of scannedPayments) {
        try {
          const balance = await publicClient.getBalance({
            address: payment.stealthAddress,
          })

          // Only include if balance > 0
          if (balance > 0n) {
            const paymentData: CollectablePayment = {
              stealthAddress: payment.stealthAddress,
              stealthPrivateKey: payment.stealthPrivateKey,
              balance,
              balanceFormatted: formatEther(balance),
              token: payment.token,
              receiptHash: payment.receiptHash,
              txHash: payment.txHash,
              blockNumber: payment.blockNumber,
            }

            // Separate into collectable vs dust based on Mantle gas costs
            if (balance >= MINIMUM_COLLECTABLE_BALANCE) {
              collectablePayments.push(paymentData)
            } else {
              dustPaymentsList.push(paymentData)
            }
          }
        } catch {
          // Skip payments where we can't get balance
          continue
        }
      }

      setPayments(collectablePayments)
      setDustPayments(dustPaymentsList)
    } catch (error) {
      console.error('[useCollection] Scan failed:', error)
      setScanError(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }, [publicClient, keys, masterSignature, chainId])

  /**
   * Collect all pending payments to a recipient address.
   * @param recipient - Optional recipient address (defaults to connected wallet)
   */
  const collectAll = useCallback(
    async (recipient?: `0x${string}`) => {
      const toAddress = recipient || address
      if (!walletClient || !publicClient || !toAddress || payments.length === 0) {
        setCollectError('Missing wallet or no payments to collect')
        return
      }

      setIsCollecting(true)
      setCollectError(null)
      setCollectTxHashes([])

      const collectedHashes: `0x${string}`[] = []
      const collectedAddresses: `0x${string}`[] = []

      try {
        // For each payment, create a transaction from the stealth address
        for (let i = 0; i < payments.length; i++) {
          const payment = payments[i]
          // Create a wallet from the stealth private key
          const { privateKeyToAccount } = await import('viem/accounts')
          const stealthAccount = privateKeyToAccount(
            `0x${bytesToHex(payment.stealthPrivateKey)}` as Hex
          )

          // Create a wallet client for the stealth account
          const { createWalletClient, http } = await import('viem')
          const { mantle } = await import('viem/chains')

          // Use public Mantle RPC for collection transactions
          // Alchemy has issues with gas estimation on Mantle
          const rpcUrl = 'https://rpc.mantle.xyz'

          const stealthWalletClient = createWalletClient({
            account: stealthAccount,
            chain: mantle,
            transport: http(rpcUrl),
          })

          // Create public client for gas price lookup
          const { createPublicClient } = await import('viem')
          const stealthPublicClient = createPublicClient({
            chain: mantle,
            transport: http(rpcUrl),
          })

          // Check current on-chain balance (not cached from scan)
          const currentBalance = await stealthPublicClient.getBalance({
            address: payment.stealthAddress,
          })

          // Check if already collected (balance is now 0 or very low)
          if (currentBalance < parseEther('0.0001')) {
            setCollectError('Already collected or balance too low')
            continue
          }

          // Get gas price for legacy transaction
          const gasPrice = await stealthPublicClient.getGasPrice()

          // Send as legacy transaction with high gas limit for Mantle L2
          // Mantle requires ~58.5M gas for L1 data costs (verified from successful tx)
          // Gas limit must be higher than used, but only used amount is charged
          const gasLimit = 85000000n // 85M gas limit
          const estimatedGasUsed = 60000000n // ~60M actually used (58.5M + buffer)
          const estimatedGasCost = estimatedGasUsed * gasPrice

          // Minimum balance: gas cost + something to send
          const minBalance = estimatedGasCost + parseEther('0.0001')
          if (currentBalance < minBalance) {
            setCollectError(
              `Balance too low. Mantle L1 gas costs ~${formatEther(estimatedGasCost)} MNT. Have: ${formatEther(currentBalance)} MNT, Need: ~${formatEther(minBalance)} MNT`
            )
            continue
          }

          // Send balance minus estimated gas (excess gas refunded by network)
          const properAmountToSend = currentBalance - estimatedGasCost

          const hash = await stealthWalletClient.sendTransaction({
            to: toAddress,
            value: properAmountToSend,
            gas: gasLimit,
            gasPrice,
            type: 'legacy',
          })

          collectedHashes.push(hash)
          collectedAddresses.push(payment.stealthAddress)
        }

        // Update state with collected hashes
        if (collectedHashes.length > 0) {
          setCollectTxHashes(collectedHashes)
          // Remove collected payments from the list
          setPayments((prev) => prev.filter((p) => !collectedAddresses.includes(p.stealthAddress)))
        }
      } catch (error) {
        console.error('Collection failed:', error)
        setCollectError(error instanceof Error ? error.message : 'Collection failed')
      } finally {
        setIsCollecting(false)
      }
    },
    [walletClient, publicClient, address, payments]
  )

  const totalBalance = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.balance, 0n)
  }, [payments])

  const totalBalanceFormatted = formatEther(totalBalance)

  const totalDustBalance = useMemo(() => {
    return dustPayments.reduce((sum, p) => sum + p.balance, 0n)
  }, [dustPayments])

  return {
    payments,
    dustPayments,
    totalBalance,
    totalBalanceFormatted,
    totalDustBalance,
    totalDustBalanceFormatted: formatEther(totalDustBalance),
    minimumCollectable: MINIMUM_COLLECTABLE_BALANCE,
    minimumCollectableFormatted: formatEther(MINIMUM_COLLECTABLE_BALANCE),
    isScanning,
    isCollecting,
    scanError,
    collectError,
    collectTxHashes,
    scan,
    collectAll,
    hasKeys: !!keys && !!masterSignature,
  }
}

/**
 * Convert hex string to Uint8Array.
 */
function hexToBytes(hex: `0x${string}`): Uint8Array {
  const cleanHex = hex.slice(2)
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to hex string (without 0x prefix).
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
