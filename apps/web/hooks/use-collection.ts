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

import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import {
  formatEther,
  parseEther,
  type Hex,
  keccak256,
  stringToBytes,
  type Address,
  encodeFunctionData,
} from 'viem'
import { useStealthContext } from '@/contexts/stealth-context'
import { usePoolContext, type PoolDeposit } from '@/contexts/pool-context'
import {
  scanAnnouncements,
  derivePortKeys,
  formatStealthMetaAddress,
  type Announcement,
} from '@galeon/stealth'
import {
  createDepositSecrets,
  createWithdrawalSecrets,
  computeCommitmentHash,
  POOL_CONTRACTS,
  entrypointAbi,
  poolAbi,
  PoolMerkleTree,
  generateMergeDepositProof,
  formatMergeDepositProofForContract,
  computeMergeDepositContext,
  type MergeDepositProofInput,
} from '@galeon/pool'
import {
  announcementsApi,
  portsApi,
  receiptsApi,
  registryApi,
  merkleLeavesApi,
  aspApi,
  nullifierApi,
  mergeDepositsApi,
  healthApi,
  sentPaymentsApi,
  type PreflightResult,
} from '@/lib/api'
import { poseidonHash, recoverMergeDeposit, type MergeDepositEvent } from '@galeon/pool'
import { isSupportedChain, getStealthContracts, galeonRegistryAbi } from '@/lib/contracts'
import { encodeAbiParameters } from 'viem'

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

/**
 * Format a bigint wei value to a human-readable string with limited decimals.
 * @param wei - The value in wei
 * @param maxDecimals - Maximum decimal places (default 4)
 */
function formatBalance(wei: bigint, maxDecimals = 4): string {
  const formatted = formatEther(wei)
  const num = parseFloat(formatted)
  if (num === 0) return '0'
  if (num < 0.0001) return '<0.0001'
  return num.toLocaleString('en-US', { maximumFractionDigits: maxDecimals })
}

/** Payment that can be collected */
export interface CollectablePayment {
  stealthAddress: `0x${string}`
  stealthPrivateKey: Uint8Array
  balance: bigint
  balanceFormatted: string
  /** Verified balance from GaleonRegistry - max amount that can be deposited to pool */
  verifiedBalance: bigint
  verifiedBalanceFormatted: string
  /** Whether this payment can be deposited to the privacy pool */
  canDepositToPool: boolean
  token: `0x${string}` | null
  receiptHash: `0x${string}`
  txHash: `0x${string}`
  blockNumber: bigint
  /** Port ID this payment belongs to */
  portId: string
  /** Port label for display */
  portLabel: string
}

/** Progress tracking for multi-payment pool deposits */
export interface PoolDepositProgress {
  current: number // 1-indexed
  total: number
  currentAddress: `0x${string}`
  status: 'preparing' | 'signing' | 'confirming' | 'syncing'
}

/** Result of a single payment deposit */
export interface PoolDepositResult {
  address: `0x${string}`
  hash: `0x${string}` | null
  success: boolean
  error?: string
  amount: bigint
}

/**
 * Hook for scanning and collecting payments.
 */
export function useCollection() {
  const queryClient = useQueryClient()
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { keys, masterSignature } = useStealthContext()
  const { masterNullifier, masterSecret, poolScope, hasPoolKeys, deposits, forceSync, addDeposit } =
    usePoolContext()

  const [payments, setPayments] = useState<CollectablePayment[]>([])
  const [dustPayments, setDustPayments] = useState<CollectablePayment[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [isDepositingToPool, setIsDepositingToPool] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [collectError, setCollectError] = useState<string | null>(null)
  const [collectTxHashes, setCollectTxHashes] = useState<`0x${string}`[]>([])

  // Preflight state for pool deposits
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(false)

  // Multi-payment deposit progress tracking
  const [depositProgress, setDepositProgress] = useState<PoolDepositProgress | null>(null)
  const [depositResults, setDepositResults] = useState<PoolDepositResult[]>([])

  // Track previous masterSignature to detect wallet changes
  const prevMasterSignatureRef = useRef<string | null>(null)

  // Clear payments when wallet/keys change (masterSignature changes)
  useEffect(() => {
    const currentSig = masterSignature ?? null

    // If signature changed (including from null to value or value to null), clear state
    if (prevMasterSignatureRef.current !== currentSig) {
      // Only clear if we had something before (avoid clearing on initial mount)
      if (prevMasterSignatureRef.current !== null) {
        console.log('[useCollection] Keys changed, clearing payments')
        setPayments([])
        setDustPayments([])
        setScanError(null)
        setCollectError(null)
        setCollectTxHashes([])
      }
      prevMasterSignatureRef.current = currentSig
    }
  }, [masterSignature])

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
      console.log('[scan] Fetched', apiAnnouncements.length, 'announcements from API')

      // Fetch ALL user's Ports to get Port-specific keys
      // Include archived ports so we can scan for payments on all ports
      // Use listAll to handle pagination - ensures no ports are missed even with >100 ports
      const userPorts = await portsApi.listAll({ includeArchived: true })
      console.log(
        '[scan] Found',
        userPorts.length,
        'ports for user:',
        userPorts.map((p) => ({
          id: p.id,
          name: p.name,
          indexerPortId: p.indexerPortId,
          hasStealthMeta: !!p.stealthMetaAddress,
        }))
      )

      // Convert API response to Announcement format for scanning
      const announcements: Announcement[] = apiAnnouncements.map((ann) => ({
        stealthAddress: ann.stealthAddress as `0x${string}`,
        ephemeralPubKey: hexToBytes(ann.ephemeralPubKey as `0x${string}`),
        metadata: hexToBytes(ann.metadata as `0x${string}`),
        txHash: ann.transactionHash as `0x${string}`,
        blockNumber: BigInt(ann.blockNumber),
      }))

      // Debug: Log first few announcements
      if (announcements.length > 0) {
        console.log('[scan] First announcement sample:', {
          stealthAddress: announcements[0].stealthAddress,
          ephemeralPubKeyLength: announcements[0].ephemeralPubKey.length,
          metadataLength: announcements[0].metadata.length,
          viewTag: announcements[0].metadata[0],
        })
      }

      // Scan for payments across ALL user Ports
      // Each Port has its own derived keys, so we scan with each Port's keys
      // We track which port each payment belongs to for per-port collection
      // Note: ScannedPayment has its own portId from chain, we override with our UUID-based portId
      type ScannedPaymentBase = ReturnType<typeof scanAnnouncements>[number]
      type ScannedPaymentWithPort = Omit<ScannedPaymentBase, 'portId'> & {
        portId: string
        portLabel: string
      }
      const allScannedPayments: ScannedPaymentWithPort[] = []

      for (const port of userPorts) {
        // Use indexerPortId (on-chain portId) for key derivation
        // Keys are derived from the on-chain portId, which is stable and recoverable
        if (!port.indexerPortId) {
          console.log(
            '[scan] Skipping port',
            port.name,
            '- no indexerPortId (pending registration)'
          )
          continue
        }

        // CRITICAL: Normalize indexerPortId to lowercase hex for consistent key derivation
        // The on-chain portId is always lowercase from keccak256, but database may store it differently
        const normalizedPortId = port.indexerPortId.toLowerCase()

        // Debug: Show the raw bytes that uuidToPortIndex will hash
        const rawBytesHex = Array.from(stringToBytes(normalizedPortId))
          .slice(0, 10)
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ')

        console.log('[scan] Port', port.name, 'indexerPortId:', {
          raw: port.indexerPortId,
          normalized: normalizedPortId,
          sameCase: port.indexerPortId === normalizedPortId,
          first10Bytes: rawBytesHex,
          length: port.indexerPortId.length,
        })

        const portIndex = uuidToPortIndex(normalizedPortId)
        const portKeys = derivePortKeys(masterSignature, portIndex)

        // CRITICAL: Verify derived keys match the on-chain stealth meta-address
        // This ensures we never scan with wrong keys (which would miss payments)
        const derivedStealthMeta = formatStealthMetaAddress(
          portKeys.spendingPublicKey,
          portKeys.viewingPublicKey,
          'mnt'
        )
        const keysMatch =
          port.stealthMetaAddress?.toLowerCase() === derivedStealthMeta.toLowerCase()

        console.log('[scan] Port', port.name, 'key verification:', {
          portIndex,
          indexerPortId: port.indexerPortId,
          normalizedPortId,
          onChainMeta: port.stealthMetaAddress?.slice(0, 50) + '...',
          derivedMeta: derivedStealthMeta.slice(0, 50) + '...',
          keysMatch,
        })

        // If keys don't match, try fallback: derive from backend UUID (legacy ports)
        let finalPortKeys = portKeys
        let usedFallback = false

        if (!keysMatch) {
          // Try legacy key derivation using backend UUID
          console.log('[scan] Trying legacy key derivation for port', port.name)
          const legacyPortIndex = uuidToPortIndex(port.id)
          const legacyKeys = derivePortKeys(masterSignature, legacyPortIndex)
          const legacyMeta = formatStealthMetaAddress(
            legacyKeys.spendingPublicKey,
            legacyKeys.viewingPublicKey,
            'mnt'
          )
          const legacyMatch = port.stealthMetaAddress?.toLowerCase() === legacyMeta.toLowerCase()

          console.log('[scan] Port', port.name, 'legacy key verification:', {
            legacyPortIndex,
            backendUUID: port.id,
            storedMeta: port.stealthMetaAddress?.slice(0, 50) + '...',
            legacyMeta: legacyMeta.slice(0, 50) + '...',
            legacyMatch,
          })

          if (legacyMatch) {
            console.log('[scan] Legacy keys matched for port', port.name, '✓')
            finalPortKeys = legacyKeys
            usedFallback = true
          } else {
            // Neither new nor legacy keys match - skip this port
            console.warn('[scan] Skipping port', port.name, '- neither new nor legacy keys match')
            console.warn(
              '[scan] This port may have been created with a different wallet or is corrupted'
            )
            console.warn('[scan] Stored stealth meta:', port.stealthMetaAddress)
            console.warn('[scan] Derived from indexerPortId:', derivedStealthMeta)
            console.warn('[scan] Derived from backend UUID:', legacyMeta)
            continue
          }
        }

        console.log(
          '[scan] Scanning port:',
          port.name,
          usedFallback ? '✓ (legacy keys)' : '✓ keys verified'
        )

        const portPayments = scanAnnouncements(
          announcements,
          finalPortKeys.spendingPrivateKey,
          finalPortKeys.viewingPrivateKey
        )
        console.log('[scan] Port', port.name, 'found', portPayments.length, 'payments')
        // Add port info to each payment
        for (const payment of portPayments) {
          allScannedPayments.push({
            ...payment,
            portId: port.id,
            portLabel: port.name,
          })
        }
      }
      console.log('[scan] Total scanned payments:', allScannedPayments.length)

      const scannedPayments = allScannedPayments

      // Get balances and verified balances for each payment IN PARALLEL
      const collectablePayments: CollectablePayment[] = []
      const dustPaymentsList: CollectablePayment[] = []

      // Fetch ALL balances in parallel for speed
      console.log(
        '[scan] Fetching balances for',
        scannedPayments.length,
        'stealth addresses in parallel...'
      )
      const balanceResults = await Promise.all(
        scannedPayments.map(async (payment) => {
          try {
            const balance = await publicClient.getBalance({
              address: payment.stealthAddress,
            })
            return { payment, balance, error: null }
          } catch (err) {
            return { payment, balance: 0n, error: err }
          }
        })
      )

      // Filter to only payments with balance > 0
      const paymentsWithBalance = balanceResults.filter((r) => r.balance > 0n && !r.error)
      console.log('[scan] Found', paymentsWithBalance.length, 'addresses with balance')

      // Fetch verified balance data from backend API for all payments with balance
      if (paymentsWithBalance.length > 0) {
        console.log(
          '[scan] Fetching verified balances from backend for',
          paymentsWithBalance.length,
          'addresses...'
        )

        // Get verified balances from backend (which calls GaleonRegistry)
        const addresses = paymentsWithBalance.map(({ payment }) => payment.stealthAddress)
        const verifiedBalances = await registryApi.getVerifiedBalances(addresses, chainId ?? 5000)

        // Create a map for fast lookup
        const verifiedBalanceMap = new Map(
          verifiedBalances.map((vb) => [vb.stealthAddress.toLowerCase(), vb])
        )

        // Build payment data from results
        for (const { payment, balance } of paymentsWithBalance) {
          const vbInfo = verifiedBalanceMap.get(payment.stealthAddress.toLowerCase())
          const verifiedBalance = vbInfo ? BigInt(vbInfo.verifiedBalance) : 0n
          const canDepositToPool = vbInfo?.canDeposit ?? false

          const paymentData: CollectablePayment = {
            stealthAddress: payment.stealthAddress,
            stealthPrivateKey: payment.stealthPrivateKey,
            balance,
            balanceFormatted: formatBalance(balance),
            verifiedBalance,
            verifiedBalanceFormatted: formatBalance(verifiedBalance),
            canDepositToPool,
            token: payment.token,
            receiptHash: payment.receiptHash,
            txHash: payment.txHash,
            blockNumber: payment.blockNumber,
            portId: payment.portId,
            portLabel: payment.portLabel,
          }

          if (balance >= MINIMUM_COLLECTABLE_BALANCE) {
            collectablePayments.push(paymentData)
          } else {
            dustPaymentsList.push(paymentData)
          }
        }
      }

      console.log(
        '[scan] Scan complete:',
        collectablePayments.length,
        'collectable,',
        dustPaymentsList.length,
        'dust'
      )
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
   * Run preflight check for pool deposit (merge deposit).
   * Uses the same preflight service as withdrawals.
   */
  const runPoolPreflight = useCallback(async () => {
    if (!chainId || !(chainId in POOL_CONTRACTS)) {
      setPreflight(null)
      return
    }

    // Need an existing deposit to merge into for preflight
    if (deposits.length === 0) {
      // For first deposit, no preflight needed (no merge)
      setPreflight({
        canProceed: true,
        checks: {
          indexerSynced: true,
          aspSynced: true,
          stateTreeValid: true,
          labelExists: true,
        },
        errors: [],
        warnings: [],
      })
      return
    }

    const contracts = POOL_CONTRACTS[chainId as keyof typeof POOL_CONTRACTS]
    const largestDeposit = deposits.reduce((max, d) => (d.value > max.value ? d : max), deposits[0])

    setIsLoadingPreflight(true)
    try {
      const result = await healthApi.preflight('privatesend', {
        poolAddress: contracts.pool,
        depositLabel: largestDeposit.label.toString(),
      })
      setPreflight(result)
    } catch (err) {
      console.error('[useCollection] Preflight check failed:', err)
      setPreflight({
        canProceed: false,
        checks: {
          indexerSynced: false,
          aspSynced: false,
          stateTreeValid: false,
          labelExists: false,
        },
        errors: [err instanceof Error ? err.message : 'Preflight check failed'],
        warnings: [],
      })
    } finally {
      setIsLoadingPreflight(false)
    }
  }, [chainId, deposits])

  /**
   * Collect payments to a recipient address.
   * @param recipient - Optional recipient address (defaults to connected wallet)
   * @param targetAmount - Optional target amount to send (defaults to ALL funds from all addresses)
   *                       When specified, processes ONE stealth address at a time
   * @param portId - Optional port ID to filter payments (only collect from this port)
   */
  const collectAll = useCallback(
    async (recipient?: `0x${string}`, targetAmount?: number, portId?: string) => {
      const toAddress = recipient || address

      // Filter payments by portId if specified
      const filteredPayments = portId ? payments.filter((p) => p.portId === portId) : payments

      if (!walletClient || !publicClient || !toAddress || filteredPayments.length === 0) {
        setCollectError(
          portId
            ? 'No payments to collect from this port'
            : 'Missing wallet or no payments to collect'
        )
        return
      }

      setIsCollecting(true)
      setCollectError(null)
      setCollectTxHashes([])

      const collectedHashes: `0x${string}`[] = []
      const collectedAddresses: `0x${string}`[] = []
      const actualAmountsSent: bigint[] = [] // Track actual amounts sent (after gas)

      // If target amount specified, only process ONE payment (highest balance first)
      const paymentsToProcess =
        targetAmount !== undefined
          ? [...filteredPayments].sort((a, b) => (b.balance > a.balance ? 1 : -1)).slice(0, 1)
          : filteredPayments

      try {
        // For each payment, create a transaction from the stealth address
        for (let i = 0; i < paymentsToProcess.length; i++) {
          const payment = paymentsToProcess[i]
          // Create a wallet from the stealth private key
          const { privateKeyToAccount } = await import('viem/accounts')
          const stealthAccount = privateKeyToAccount(
            `0x${bytesToHex(payment.stealthPrivateKey)}` as Hex
          )

          // Create a wallet client for the stealth account
          const { createWalletClient, http } = await import('viem')
          const { mantle } = await import('viem/chains')

          // Use Alchemy RPC for better reliability (falls back to public if not configured)
          const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
          const rpcUrl = alchemyKey
            ? `https://mantle-mainnet.g.alchemy.com/v2/${alchemyKey}`
            : 'https://rpc.mantle.xyz'

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
          // IMPORTANT: Blockchain reserves gasLimit * gasPrice upfront, refunds unused after
          const gasLimit = 85000000n // 85M gas limit

          // Calculate max gas cost based on gasLimit (what blockchain reserves)
          const maxGasCost = gasLimit * gasPrice

          // Minimum balance: max gas cost + something to send
          const minBalance = maxGasCost + parseEther('0.0001')
          if (currentBalance < minBalance) {
            setCollectError(
              `Balance too low. Mantle L1 gas requires ~${formatEther(maxGasCost)} MNT reserved. Have: ${formatEther(currentBalance)} MNT, Need: ~${formatEther(minBalance)} MNT`
            )
            continue
          }

          // Send balance minus max gas cost (unused gas is refunded after tx)
          let properAmountToSend = currentBalance - maxGasCost

          // Cap by target amount if specified
          if (targetAmount !== undefined) {
            const targetAmountWei = parseEther(targetAmount.toString())
            if (properAmountToSend > targetAmountWei) {
              properAmountToSend = targetAmountWei
              console.log(
                '[collectAll] Capped by target amount:',
                formatEther(properAmountToSend),
                'MNT'
              )
            }
          }

          const hash = await stealthWalletClient.sendTransaction({
            to: toAddress,
            value: properAmountToSend,
            gas: gasLimit,
            gasPrice,
            type: 'legacy',
          })

          collectedHashes.push(hash)
          collectedAddresses.push(payment.stealthAddress)
          actualAmountsSent.push(properAmountToSend) // Track the actual amount sent
        }

        // Update state with collected hashes
        if (collectedHashes.length > 0) {
          setCollectTxHashes(collectedHashes)
          // Remove collected payments from the list
          setPayments((prev) => prev.filter((p) => !collectedAddresses.includes(p.stealthAddress)))

          // Mark receipts as collected in backend (update port totals)
          try {
            const result = await receiptsApi.markCollected(collectedAddresses)
            console.log('[collectAll] Marked receipts as collected:', result)
            // Invalidate ports query so dashboard sees updated totals
            await queryClient.invalidateQueries({ queryKey: ['ports'] })
          } catch (err) {
            console.warn('[collectAll] Failed to mark receipts as collected (non-blocking):', err)
          }

          // Record sent payment for payment history (only if sending to external recipient)
          // This is a "stealth pay" - paying from collected stealth funds
          if (toAddress && toAddress !== address) {
            try {
              // Calculate total amount ACTUALLY sent (not original balance - gas deducted)
              const totalSent = actualAmountsSent.reduce((sum, amt) => sum + amt, 0n)

              await sentPaymentsApi.create({
                txHash: collectedHashes[0], // Use first tx hash as reference
                chainId: chainId ?? 5000,
                recipientAddress: toAddress,
                amount: totalSent.toString(),
                currency: 'MNT',
                source: 'port',
                memo: undefined,
              })
              console.log(
                '[collectAll] Sent payment recorded:',
                collectedHashes[0],
                'Amount:',
                formatEther(totalSent),
                'MNT'
              )
            } catch (err) {
              console.warn('[collectAll] Failed to record sent payment (non-blocking):', err)
            }
          }
        }
      } catch (error) {
        console.error('Collection failed:', error)
        setCollectError(error instanceof Error ? error.message : 'Collection failed')
      } finally {
        setIsCollecting(false)
      }
    },
    [walletClient, publicClient, address, payments, queryClient]
  )

  /**
   * Deposit a payment to the privacy pool.
   * Processes ONE payment at a time for safety (avoids precommitment collisions).
   * @param targetAmount - Optional target amount to deposit (defaults to max verified)
   * @param portId - Optional port ID to filter payments (only deposit from this port)
   */
  const collectToPool = useCallback(
    async (targetAmount?: number, portId?: string) => {
      console.log('[collectToPool] Starting pool deposit...', { targetAmount, portId })
      console.log('[collectToPool] Pool keys:', {
        hasMasterNullifier: !!masterNullifier,
        hasMasterSecret: !!masterSecret,
        poolScope: poolScope?.toString(),
      })

      // IMPORTANT: Force sync pool state before merge deposit to ensure fresh data
      // This is especially critical when coming from a port-specific page that might have stale context
      console.log('[collectToPool] Force syncing pool state before merge...')
      try {
        await forceSync()
        console.log('[collectToPool] Pool state synced successfully')
      } catch (syncError) {
        console.warn('[collectToPool] Force sync failed (continuing anyway):', syncError)
      }

      if (!masterNullifier || !masterSecret || !poolScope) {
        setCollectError('Pool keys not derived. Please sign in to the pool first.')
        return
      }
      // Filter payments by portId if specified
      const filteredPayments = portId ? payments.filter((p) => p.portId === portId) : payments

      if (!publicClient || filteredPayments.length === 0) {
        setCollectError(portId ? 'No payments to deposit from this port' : 'No payments to deposit')
        return
      }
      if (!chainId || !(chainId in POOL_CONTRACTS)) {
        setCollectError('Pool not available on this chain')
        return
      }

      const contracts = POOL_CONTRACTS[chainId as keyof typeof POOL_CONTRACTS]
      console.log('[collectToPool] Entrypoint address:', contracts.entrypoint)

      if (contracts.entrypoint === '0x0000000000000000000000000000000000000000') {
        setCollectError('Pool contracts not deployed on this chain')
        return
      }

      setIsDepositingToPool(true)
      setCollectError(null)
      setCollectTxHashes([])

      const _depositedHashes: `0x${string}`[] = []
      const _depositedAddresses: `0x${string}`[] = []

      // Find the next available deposit index by checking on-chain
      // This is more reliable than using local state which can be stale
      let depositIndex = BigInt(deposits.length)
      console.log('[collectToPool] Initial deposit index from context:', depositIndex.toString())
      console.log('[collectToPool] Current deposits in context:', deposits.length)

      try {
        // Create public client for reading contract state
        const { createPublicClient, http } = await import('viem')
        const { mantle } = await import('viem/chains')

        // Use Alchemy RPC for better reliability (falls back to public if not configured)
        const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
        const rpcUrl = alchemyKey
          ? `https://mantle-mainnet.g.alchemy.com/v2/${alchemyKey}`
          : 'https://rpc.mantle.xyz'

        const readClient = createPublicClient({
          chain: mantle,
          transport: http(rpcUrl),
        })

        // Check minimum deposit amount from contract
        // Native asset address is 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address
        const assetConfigResult = (await readClient.readContract({
          address: contracts.entrypoint as Address,
          abi: entrypointAbi,
          functionName: 'assetConfig',
          args: [NATIVE_ASSET],
        })) as readonly [Address, bigint, bigint, bigint]
        const minimumDepositAmount = assetConfigResult[1]
        console.log(
          '[collectToPool] Minimum deposit amount:',
          formatEther(minimumDepositAmount),
          'MNT'
        )

        // Get GaleonRegistry address
        if (!isSupportedChain(chainId)) {
          setCollectError('Unsupported chain')
          return
        }
        const galeonRegistry = getStealthContracts(chainId).galeonRegistry
        console.log('[collectToPool] GaleonRegistry address:', galeonRegistry)

        // Check if pool is authorized in registry
        const isPoolAuthorized = await readClient.readContract({
          address: galeonRegistry,
          abi: galeonRegistryAbi,
          functionName: 'authorizedPools',
          args: [contracts.pool as Address],
        })
        console.log('[collectToPool] Pool authorized in registry:', isPoolAuthorized)

        if (!isPoolAuthorized) {
          setCollectError(
            'Privacy Pool is not authorized in GaleonRegistry. Contact admin to call setAuthorizedPool().'
          )
          return
        }

        // Find ALL eligible payments with verified balance
        const eligiblePayments = filteredPayments.filter(
          (p) => p.canDepositToPool && p.verifiedBalance > 0n
        )
        if (eligiblePayments.length === 0) {
          setCollectError(
            'No eligible payments for pool deposit. Payments must go through GaleonRegistry.'
          )
          return
        }

        // Sort by verified balance (highest first) to maximize first deposit
        eligiblePayments.sort((a, b) => (b.verifiedBalance > a.verifiedBalance ? 1 : -1))

        console.log(
          '[collectToPool] Processing',
          eligiblePayments.length,
          'eligible payments sequentially'
        )

        // Track results for all payments
        const results: PoolDepositResult[] = []
        const successfulHashes: `0x${string}`[] = []

        // Track the latest deposit locally across iterations to bypass indexer lag
        // This is updated after each successful merge to ensure subsequent payments
        // use the correct commitment (the one we just created, not the one from context)
        let localLatestDeposit: PoolDeposit | null = null

        // Process each payment sequentially
        for (let paymentIdx = 0; paymentIdx < eligiblePayments.length; paymentIdx++) {
          const payment = eligiblePayments[paymentIdx]

          // Update progress
          setDepositProgress({
            current: paymentIdx + 1,
            total: eligiblePayments.length,
            currentAddress: payment.stealthAddress,
            status: 'preparing',
          })

          console.log(
            `[collectToPool] Processing payment ${paymentIdx + 1}/${eligiblePayments.length}:`,
            {
              stealthAddress: payment.stealthAddress,
              balance: formatEther(payment.balance),
              verifiedBalance: formatEther(payment.verifiedBalance),
            }
          )

          // For subsequent payments, add a small delay to let on-chain state settle
          // Note: We use addDeposit() after each tx to immediately update context,
          // so we don't need the expensive forceSync() here anymore
          if (paymentIdx > 0) {
            console.log(
              '[collectToPool] Waiting for on-chain state to settle before next payment...'
            )
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }

          try {
            // Process this single payment
            // Fetch fresh registry state
            const registryVerifiedBalance = (await readClient.readContract({
              address: galeonRegistry,
              abi: galeonRegistryAbi,
              functionName: 'verifiedBalance',
              args: [
                payment.stealthAddress as Address,
                '0x0000000000000000000000000000000000000000' as Address,
              ],
            })) as bigint

            console.log(
              '[collectToPool] Fresh verified balance from registry:',
              formatEther(registryVerifiedBalance),
              'MNT'
            )

            if (registryVerifiedBalance === 0n) {
              throw new Error(
                'Verified balance is 0. This payment may have already been deposited.'
              )
            }

            // Create wallet from stealth private key
            const { privateKeyToAccount } = await import('viem/accounts')
            const stealthAccount = privateKeyToAccount(
              `0x${bytesToHex(payment.stealthPrivateKey)}` as Hex
            )

            // Create clients for the stealth account
            const { createWalletClient } = await import('viem')

            const stealthWalletClient = createWalletClient({
              account: stealthAccount,
              chain: mantle,
              transport: http(rpcUrl),
            })

            const stealthPublicClient = createPublicClient({
              chain: mantle,
              transport: http(rpcUrl),
            })

            // Check current balance
            const currentBalance = await stealthPublicClient.getBalance({
              address: payment.stealthAddress,
            })
            console.log(
              '[collectToPool] Current on-chain balance:',
              formatEther(currentBalance),
              'MNT'
            )

            if (currentBalance < parseEther('0.0001')) {
              throw new Error('Balance too low (already collected?)')
            }

            // Get gas price
            const gasPrice = await stealthPublicClient.getGasPrice()
            console.log('[collectToPool] Gas price:', gasPrice.toString())

            // Quick gas headroom check (fail-fast before expensive operations)
            // Actual gas estimation happens later with real tx parameters
            // These are conservative upper bounds: merge ~60M gas, deposit ~3M gas
            // We add 50% margin to account for gas price fluctuations
            const baseGasEstimate = deposits.length > 0 ? 60_000_000n : 3_000_000n
            const gasMargin = baseGasEstimate / 2n // 50% margin
            const minGasReserve = (baseGasEstimate + gasMargin) * gasPrice
            const availableForDeposit = currentBalance - minGasReserve

            if (availableForDeposit <= 0n) {
              const neededMNT = formatEther(minGasReserve)
              throw new Error(
                `Insufficient gas. Need ~${neededMNT} MNT for gas, but only have ${formatEther(currentBalance)} MNT`
              )
            }
            console.log('[collectToPool] Gas headroom check passed:', {
              currentBalance: formatEther(currentBalance),
              minGasReserve: formatEther(minGasReserve),
              availableForDeposit: formatEther(availableForDeposit),
              note: 'Actual gas will be estimated precisely before tx',
            })

            // Determine if we should merge (user has existing deposits) or create new
            const shouldMerge = deposits.length > 0
            console.log(
              '[collectToPool] Should merge:',
              shouldMerge,
              'deposits.length:',
              deposits.length
            )

            // DEBUG: Log all deposits from context
            if (deposits.length > 0) {
              console.log(
                '[collectToPool] Context deposits:',
                deposits.map((d, i) => ({
                  idx: i,
                  index: d.index.toString(),
                  derivationDepth: d.derivationDepth.toString(),
                  value: formatEther(d.value),
                  label_short: d.label.toString().slice(0, 20) + '...',
                  nullifier_short: d.nullifier.toString().slice(0, 20) + '...',
                }))
              )
            }

            let hash: `0x${string}`
            // Hoist these for use in immediate update after tx
            let existingDeposit: PoolDeposit | null = null
            let newSecrets: { nullifier: bigint; secret: bigint } | null = null
            let firstDepositPrecommitment: {
              nullifier: bigint
              secret: bigint
              hash: bigint
            } | null = null
            let firstDepositIndex: bigint = 0n

            if (shouldMerge) {
              // ========== MERGE DEPOSIT FLOW ==========
              // Check if we have a locally-tracked deposit from a previous iteration in this loop
              // This bypasses the indexer entirely for sequential deposits

              if (localLatestDeposit !== null) {
                // Use the deposit we just created in the previous iteration
                // This bypasses the indexer entirely - we know this deposit is valid
                const localDeposit = localLatestDeposit // TypeScript narrows type here
                existingDeposit = localDeposit
                console.log(
                  '[collectToPool] Using locally-tracked deposit from previous iteration:',
                  {
                    label: localDeposit.label.toString(),
                    value: formatEther(localDeposit.value),
                    derivationDepth: localDeposit.derivationDepth.toString(),
                    nullifier: localDeposit.nullifier.toString().slice(0, 20) + '...',
                  }
                )
              } else {
                // First merge in this session - use context deposits and trace via indexer
                // Find the largest existing deposit to merge into
                const selectedDeposit = deposits.reduce(
                  (max, d) => (d.value > max.value ? d : max),
                  deposits[0]
                )
                console.log('[collectToPool] Selected deposit for merge:', {
                  label: selectedDeposit.label.toString(),
                  value: formatEther(selectedDeposit.value),
                  derivationDepth: selectedDeposit.derivationDepth.toString(),
                  nullifier: selectedDeposit.nullifier.toString().slice(0, 20) + '...',
                })

                // ========== RESOLVE ACTIVE COMMITMENT ==========
                // The selected deposit may be stale if a merge happened recently.
                // Trace through the merge chain to find the current active commitment.
                console.log('[collectToPool] Resolving current active commitment...')

                // Fetch all merge events for this pool
                const mergeEventsRaw = await mergeDepositsApi.list({
                  pool: contracts.pool,
                  chainId: chainId ?? 5000,
                })

                // Convert to MergeDepositEvent format
                const mergeEvents: MergeDepositEvent[] = mergeEventsRaw.map((m) => ({
                  existingNullifierHash: BigInt(m.existingNullifierHash),
                  newCommitment: BigInt(m.newCommitment),
                  depositValue: BigInt(m.depositValue),
                  blockNumber: BigInt(m.blockNumber),
                  txHash: m.transactionHash as `0x${string}`,
                }))

                // Build a map for quick lookup: nullifierHash -> merge event
                const mergeByNullifier = new Map<string, MergeDepositEvent>()
                for (const merge of mergeEvents) {
                  mergeByNullifier.set(merge.existingNullifierHash.toString(), merge)
                }

                // Trace from selected deposit to find active commitment
                let currentDeposit: PoolDeposit = selectedDeposit
                let currentValue = selectedDeposit.value
                let traceDepth = 0
                const MAX_TRACE_DEPTH = 50

                while (traceDepth < MAX_TRACE_DEPTH) {
                  // Compute nullifier hash for current deposit
                  const nullifierHash = await poseidonHash([currentDeposit.nullifier])
                  const nullifierHashHex = `0x${nullifierHash.toString(16).padStart(64, '0')}`

                  // Check if this nullifier has been spent
                  const spendInfo = await nullifierApi.check(nullifierHashHex, chainId ?? 5000)

                  if (!spendInfo.spent) {
                    // Not spent - this is the active deposit
                    console.log(
                      `[collectToPool] Found active commitment at derivationDepth ${currentDeposit.derivationDepth}`
                    )
                    break
                  }

                  if (spendInfo.spentBy === 'withdrawal') {
                    // Spent via withdrawal - check if full or partial
                    const zeroCommitment =
                      '0x0000000000000000000000000000000000000000000000000000000000000000'
                    if (
                      !spendInfo.withdrawal ||
                      spendInfo.withdrawal.newCommitment === zeroCommitment
                    ) {
                      throw new Error('Selected deposit was fully withdrawn. Please refresh.')
                    }
                    // Partial withdrawal - for now, error (complex to trace)
                    throw new Error(
                      'Selected deposit has partial withdrawal change. Please refresh pool state.'
                    )
                  }

                  if (spendInfo.spentBy === 'merge') {
                    // Spent via merge - use the merge data from the API response
                    console.log(
                      `[collectToPool] Deposit at depth ${currentDeposit.derivationDepth} was merged, tracing...`
                    )

                    // Use merge data from API response directly (more reliable than local lookup)
                    const apiMerge = spendInfo.mergeDeposit
                    if (!apiMerge) {
                      // Fallback to local map lookup
                      const mergeEvent = mergeByNullifier.get(nullifierHash.toString())
                      if (!mergeEvent) {
                        throw new Error('Could not find merge event. Please refresh pool state.')
                      }
                    }

                    // Create MergeDepositEvent from API data
                    const mergeEvent: MergeDepositEvent = apiMerge
                      ? {
                          existingNullifierHash: BigInt(apiMerge.existingNullifierHash),
                          newCommitment: BigInt(apiMerge.newCommitment),
                          depositValue: BigInt(apiMerge.depositValue),
                          blockNumber: BigInt(apiMerge.blockNumber),
                          txHash: apiMerge.transactionHash as `0x${string}`,
                        }
                      : mergeByNullifier.get(nullifierHash.toString())!

                    console.log('[collectToPool] Using merge event:', {
                      existingNullifierHash: mergeEvent.existingNullifierHash.toString(),
                      newCommitment: mergeEvent.newCommitment.toString(),
                      depositValue: formatEther(mergeEvent.depositValue),
                    })

                    // Recover the new commitment after merge
                    // Note: recoverMergeDeposit finds the actual childIndex used by brute-force
                    const recoveredDeposit = await recoverMergeDeposit(
                      masterNullifier,
                      masterSecret,
                      {
                        index: currentDeposit.index,
                        nullifier: currentDeposit.nullifier,
                        secret: currentDeposit.secret,
                        precommitmentHash: currentDeposit.precommitmentHash,
                        value: currentDeposit.value,
                        label: currentDeposit.label,
                        blockNumber: currentDeposit.blockNumber,
                        txHash: currentDeposit.txHash,
                      },
                      mergeEvent
                    )

                    if (!recoveredDeposit) {
                      throw new Error(
                        'Could not recover merged commitment. Please refresh pool state.'
                      )
                    }

                    console.log(`[collectToPool] Recovered merge at trace depth ${traceDepth}:`, {
                      recoveredIndex: recoveredDeposit.index.toString(),
                      previousDerivationDepth: currentDeposit.derivationDepth.toString(),
                    })

                    // Update current value (existing + merged amount)
                    currentValue = currentValue + mergeEvent.depositValue

                    // Update current deposit to the merged one
                    // Use recoveredDeposit.index as derivationDepth - this is the actual childIndex
                    // that was used in the original merge transaction
                    currentDeposit = {
                      index: currentDeposit.index,
                      derivationDepth: recoveredDeposit.index,
                      nullifier: recoveredDeposit.nullifier,
                      secret: recoveredDeposit.secret,
                      precommitmentHash: recoveredDeposit.precommitmentHash,
                      value: currentValue,
                      label: recoveredDeposit.label,
                      blockNumber: recoveredDeposit.blockNumber,
                      txHash: recoveredDeposit.txHash,
                    }

                    traceDepth++
                    continue
                  }
                }

                if (traceDepth >= MAX_TRACE_DEPTH) {
                  throw new Error('Merge chain too deep. Please contact support.')
                }

                // Use the resolved active deposit
                existingDeposit = currentDeposit
                console.log('[collectToPool] Resolved active deposit:', {
                  label: existingDeposit.label.toString(),
                  value: formatEther(existingDeposit.value),
                  derivationDepth: existingDeposit.derivationDepth.toString(),
                  nullifier: existingDeposit.nullifier.toString().slice(0, 20) + '...',
                })

                // DEBUG: Compare resolved deposit with pool context deposit
                console.log('[collectToPool] Pool context deposit vs resolved:', {
                  contextNullifier: selectedDeposit.nullifier.toString().slice(0, 20) + '...',
                  resolvedNullifier: existingDeposit.nullifier.toString().slice(0, 20) + '...',
                  nullifiersMatch: selectedDeposit.nullifier === existingDeposit.nullifier,
                  contextValue: formatEther(selectedDeposit.value),
                  resolvedValue: formatEther(existingDeposit.value),
                  contextDerivationDepth: selectedDeposit.derivationDepth.toString(),
                  resolvedDerivationDepth: existingDeposit.derivationDepth.toString(),
                  traceDepthUsed: traceDepth,
                })

                // CRITICAL: If chain tracing found a different deposit than pool context,
                // we should use the traced one (more reliable)
                if (selectedDeposit.nullifier !== existingDeposit.nullifier) {
                  console.warn(
                    '[collectToPool] WARNING: Pool context was stale! Using chain-traced deposit.'
                  )
                }
              } // end else (indexer-based tracing)

              // At this point existingDeposit is set from either localLatestDeposit or indexer tracing
              if (!existingDeposit) {
                throw new Error('Failed to resolve existing deposit for merge')
              }

              // Calculate deposit amount (reserve gas for merge tx)
              // Mantle L2 merge deposit: actual gas is ~2.1B units at ~0.0201 Gwei = ~0.042 MNT
              // With 20% buffer on gas limit: 2.5B * 0.0201 Gwei = ~0.050 MNT
              // IMPORTANT: We must reserve enough upfront because the proof commits to the value
              // and we can't adjust it later. Use 0.055 MNT to be safe.
              const initialGasEstimateMnt = parseEther('0.055')
              let depositAmount = currentBalance - initialGasEstimateMnt

              console.log('[collectToPool] Initial gas estimate:', {
                initialGasReserve: '0.055 MNT',
                currentBalance: formatEther(currentBalance),
                availableForDeposit: formatEther(depositAmount),
              })

              // Check if this payment has enough for merge (gas + minimum deposit)
              if (depositAmount < minimumDepositAmount) {
                console.log(
                  `[collectToPool] Payment ${paymentIdx + 1} has insufficient balance for merge deposit. ` +
                    `Balance: ${formatEther(currentBalance)} MNT, need ~0.05 MNT for gas + deposit. Skipping.`
                )
                // Skip this payment and continue to next
                continue
              }

              // Cap by verified balance
              if (depositAmount > registryVerifiedBalance) {
                depositAmount = registryVerifiedBalance
              }

              // Cap by target amount if specified
              if (targetAmount !== undefined) {
                const targetAmountWei = parseEther(targetAmount.toString())
                if (depositAmount > targetAmountWei) {
                  depositAmount = targetAmountWei
                }
              }

              if (depositAmount < minimumDepositAmount) {
                console.log(
                  `[collectToPool] Payment ${paymentIdx + 1} deposit amount (${formatEther(depositAmount)} MNT) ` +
                    `below minimum (${formatEther(minimumDepositAmount)} MNT) after caps. Skipping.`
                )
                continue
              }

              console.log(
                '[collectToPool] Merge deposit amount:',
                formatEther(depositAmount),
                'MNT'
              )

              // Fetch all merkle leaves for state tree
              console.log('[collectToPool] Fetching merkle leaves for state tree...')
              let allCommitments = await merkleLeavesApi.getCommitments(contracts.pool)
              if (allCommitments.length === 0) {
                throw new Error('No commitments found in pool')
              }
              console.log('[collectToPool] Fetched', allCommitments.length, 'merkle leaves')

              // If we have a locally-tracked deposit from previous iteration in this loop,
              // the indexer may not have caught up yet. We need to compute that commitment
              // hash and add it to the tree ourselves.
              if (localLatestDeposit !== null) {
                const localCommitmentHash = await computeCommitmentHash(
                  localLatestDeposit.value,
                  localLatestDeposit.label,
                  localLatestDeposit.precommitmentHash
                )
                // Check if indexer already has it
                const alreadyInTree = allCommitments.some((c) => c === localCommitmentHash)
                if (!alreadyInTree) {
                  console.log(
                    '[collectToPool] Adding locally-tracked commitment to tree (indexer lag bypass):',
                    localCommitmentHash.toString().slice(0, 20) + '...'
                  )
                  // Append to end (simulates the _insert behavior)
                  allCommitments = [...allCommitments, localCommitmentHash]
                } else {
                  console.log('[collectToPool] Indexer already has locally-tracked commitment')
                }
              }

              // Build state merkle tree
              const stateTree = await PoolMerkleTree.create(allCommitments)

              // Compute existing commitment hash
              const existingCommitmentHash = await computeCommitmentHash(
                existingDeposit.value,
                existingDeposit.label,
                existingDeposit.precommitmentHash
              )

              // Verify precommitment hash matches secrets
              const computedPrecommitment = await poseidonHash([
                existingDeposit.nullifier,
                existingDeposit.secret,
              ])
              const precommitmentMatches =
                computedPrecommitment === existingDeposit.precommitmentHash

              // DEBUG: Log commitment components
              console.log('[collectToPool] Commitment hash components:', {
                existingValue: existingDeposit.value.toString(),
                label: existingDeposit.label.toString(),
                precommitmentHash: existingDeposit.precommitmentHash.toString(),
                computedPrecommitment: computedPrecommitment.toString(),
                precommitmentMatches,
                computedCommitmentHash: existingCommitmentHash.toString(),
                nullifier_short: existingDeposit.nullifier.toString().slice(0, 20) + '...',
                secret_short: existingDeposit.secret.toString().slice(0, 20) + '...',
              })

              if (!precommitmentMatches) {
                console.error(
                  '[collectToPool] CRITICAL: Precommitment hash mismatch - secrets are stale!'
                )
              }

              // Verify commitment exists in tree
              const commitmentIndex = allCommitments.findIndex((c) => c === existingCommitmentHash)
              if (commitmentIndex === -1) {
                // DEBUG: Log first few commitments to help debug
                console.error('[collectToPool] Commitment NOT found in tree!', {
                  looking_for: existingCommitmentHash.toString(),
                  tree_size: allCommitments.length,
                  first_5_leaves: allCommitments.slice(0, 5).map((c) => c.toString()),
                  last_5_leaves: allCommitments.slice(-5).map((c) => c.toString()),
                })
                throw new Error('Existing deposit commitment not found in pool state')
              }
              console.log('[collectToPool] Commitment found at index:', commitmentIndex)

              // DEBUG: Verify the commitment in the tree matches
              const treeCommitment = allCommitments[commitmentIndex]
              console.log('[collectToPool] Tree verification:', {
                computedCommitment: existingCommitmentHash.toString(),
                treeCommitment: treeCommitment.toString(),
                match: existingCommitmentHash === treeCommitment,
                commitmentIndex,
              })

              // Get state tree root and depth from contract
              const [contractStateRoot, stateTreeDepth] = await Promise.all([
                readClient.readContract({
                  address: contracts.pool as Address,
                  abi: poolAbi,
                  functionName: 'currentRoot',
                }) as Promise<bigint>,
                readClient.readContract({
                  address: contracts.pool as Address,
                  abi: poolAbi,
                  functionName: 'currentTreeDepth',
                }) as Promise<bigint>,
              ])

              // Verify our local tree matches the on-chain state
              // If not, the indexer hasn't caught up yet
              let finalStateTree = stateTree
              let finalCommitments = allCommitments
              const computedRoot = stateTree.root

              if (computedRoot !== contractStateRoot) {
                console.warn(
                  '[collectToPool] State root mismatch - indexer may be behind',
                  '\n  Computed:',
                  computedRoot.toString(),
                  '\n  Contract:',
                  contractStateRoot.toString()
                )
                // Try refetching leaves (indexer may have caught up during computation)
                console.log('[collectToPool] Refetching merkle leaves...')
                const freshCommitments = await merkleLeavesApi.getCommitments(contracts.pool)
                const freshTree = await PoolMerkleTree.create(freshCommitments)

                if (freshTree.root !== contractStateRoot) {
                  throw new Error(
                    'Pool state is out of sync. Please wait a few seconds for indexer to catch up and try again.'
                  )
                }

                // Use the fresh tree
                console.log(
                  '[collectToPool] Refetch successful, using fresh state with',
                  freshCommitments.length,
                  'leaves'
                )

                // Verify commitment still exists in fresh tree
                const freshCommitmentIndex = freshCommitments.findIndex(
                  (c) => c === existingCommitmentHash
                )
                if (freshCommitmentIndex === -1) {
                  throw new Error(
                    'Existing deposit commitment not found after refresh. Please try again.'
                  )
                }

                finalStateTree = freshTree
                finalCommitments = freshCommitments
              }

              // Use contract root for the proof (must match what we computed)
              const stateRoot = contractStateRoot

              // Generate state proof using the final tree
              const stateProof = finalStateTree.generateProof(existingCommitmentHash)

              // DEBUG: Log state proof details
              console.log('[collectToPool] State proof generated:', {
                stateRoot: stateRoot.toString(),
                treeRoot: finalStateTree.root.toString(),
                rootsMatch: stateRoot === finalStateTree.root,
                proofIndex: stateProof.index.toString(),
                siblingsCount: stateProof.siblings.length,
              })

              // Ensure ASP tree is synced with latest deposits (includes our label)
              console.log('[collectToPool] Syncing ASP tree with latest deposits...')
              try {
                const rebuildResult = await aspApi.rebuild()
                console.log('[collectToPool] ASP sync complete:', {
                  labelsAdded: rebuildResult.labelsAdded,
                  onChainUpdated: rebuildResult.onChainUpdate?.updated ?? false,
                })
              } catch (aspErr) {
                console.warn('[collectToPool] ASP sync failed (non-fatal):', aspErr)
              }

              // Get ASP proof from backend (the backend maintains the full ASP tree)
              console.log(
                '[collectToPool] Fetching ASP proof for label:',
                existingDeposit.label.toString()
              )
              const aspProofData = await aspApi.getProof(existingDeposit.label.toString())
              console.log('[collectToPool] ASP proof received:', {
                root: aspProofData.root.toString(),
                depth: aspProofData.depth,
                index: aspProofData.index.toString(),
              })

              // Generate new secrets for merged commitment
              // Use derivationDepth + 1 to ensure unique derivations
              const childIndex = existingDeposit.derivationDepth + 1n
              console.log(
                '[collectToPool] Computing new secrets with childIndex:',
                childIndex.toString()
              )
              newSecrets = await createWithdrawalSecrets(
                masterNullifier,
                masterSecret,
                existingDeposit.label,
                childIndex
              )
              console.log('[collectToPool] Secrets comparison:', {
                existingNullifier: existingDeposit.nullifier.toString().slice(0, 20) + '...',
                newNullifier: newSecrets.nullifier.toString().slice(0, 20) + '...',
                areEqual: existingDeposit.nullifier === newSecrets.nullifier,
              })

              // Compute context using stealth address as depositor
              // Context = keccak256(abi.encode(mergeData, SCOPE)) % SNARK_SCALAR_FIELD
              const mergeData = encodeAbiParameters(
                [{ name: 'depositor', type: 'address' }],
                [payment.stealthAddress as Address]
              )
              const context = await computeMergeDepositContext(mergeData, poolScope)

              // DEBUG: Log context computation inputs
              console.log('[collectToPool] Context computation:', {
                stealthAddress: payment.stealthAddress,
                mergeData,
                poolScope: poolScope.toString(),
                context: context.toString(),
              })

              // Fetch latest on-chain ASP root for verification
              const latestOnChainASPRoot = (await readClient.readContract({
                address: contracts.entrypoint as Address,
                abi: entrypointAbi,
                functionName: 'latestRoot',
              })) as bigint

              // Verify ASP root matches on-chain (critical check)
              if (aspProofData.root !== latestOnChainASPRoot) {
                console.error('[collectToPool] ASP ROOT MISMATCH!', {
                  proofRoot: aspProofData.root.toString(),
                  onChainRoot: latestOnChainASPRoot.toString(),
                })
                throw new Error(
                  'ASP tree out of sync with contract. Please wait a few seconds and try again.'
                )
              }

              // Build merge deposit proof input
              const proofInput: MergeDepositProofInput = {
                depositValue: depositAmount,
                stateRoot,
                stateTreeDepth: Number(stateTreeDepth),
                ASPRoot: aspProofData.root,
                ASPTreeDepth: aspProofData.depth,
                context,
                label: existingDeposit.label,
                existingValue: existingDeposit.value,
                existingNullifier: existingDeposit.nullifier,
                existingSecret: existingDeposit.secret,
                newNullifier: newSecrets.nullifier,
                newSecret: newSecrets.secret,
                stateSiblings: stateProof.siblings,
                stateIndex: stateProof.index,
                ASPSiblings: aspProofData.siblings,
                ASPIndex: aspProofData.index,
              }

              // DEBUG: Verify commitment hash from proof inputs matches what we expect
              const verifyPrecommitment = await poseidonHash([
                existingDeposit.nullifier,
                existingDeposit.secret,
              ])
              const verifyCommitment = await computeCommitmentHash(
                existingDeposit.value,
                existingDeposit.label,
                verifyPrecommitment
              )
              console.log('[collectToPool] Proof input verification:', {
                inputValue: formatEther(existingDeposit.value),
                inputLabel: existingDeposit.label.toString(),
                inputPrecommitment: existingDeposit.precommitmentHash.toString(),
                computedPrecommitment: verifyPrecommitment.toString(),
                precommitmentsMatch: existingDeposit.precommitmentHash === verifyPrecommitment,
                expectedCommitment: existingCommitmentHash.toString(),
                verifiedCommitment: verifyCommitment.toString(),
                commitmentsMatch: existingCommitmentHash === verifyCommitment,
                commitmentInTree: finalCommitments.includes(existingCommitmentHash),
              })

              if (existingCommitmentHash !== verifyCommitment) {
                console.error('[collectToPool] CRITICAL: Commitment hash mismatch in proof inputs!')
                throw new Error(
                  'Internal error: commitment hash mismatch. Please refresh and try again.'
                )
              }

              // Log all public signals for debugging
              console.log('[collectToPool] Proof public inputs:', {
                depositValue: depositAmount.toString(),
                stateRoot: stateRoot.toString(),
                stateTreeDepth: Number(stateTreeDepth),
                ASPRoot: aspProofData.root.toString(),
                ASPTreeDepth: aspProofData.depth,
                context: context.toString(),
              })
              console.log('[collectToPool] On-chain values:', {
                contractStateRoot: contractStateRoot.toString(),
                latestOnChainASPRoot: latestOnChainASPRoot.toString(),
              })

              console.log('[collectToPool] Generating ZK proof (this may take 30-60 seconds)...')

              // Generate merge deposit proof
              const proof = await generateMergeDepositProof(proofInput, undefined, (status) => {
                if (status.stage === 'computing' && status.message) {
                  console.log('[collectToPool] Proof progress:', status.message)
                }
              })

              // Format proof for contract
              const formattedProof = formatMergeDepositProofForContract(proof)

              // Build contract proof struct (mergeData already computed above for context)
              const contractProof = {
                pA: formattedProof.pA as [bigint, bigint],
                pB: formattedProof.pB as [[bigint, bigint], [bigint, bigint]],
                pC: formattedProof.pC as [bigint, bigint],
                pubSignals: formattedProof.publicSignals.slice(0, 8) as [
                  bigint,
                  bigint,
                  bigint,
                  bigint,
                  bigint,
                  bigint,
                  bigint,
                  bigint,
                ],
              }

              // Compute expected nullifier hash from our existingNullifier
              const expectedNullifierHash = await poseidonHash([existingDeposit.nullifier])

              // Log proof public signals for debugging
              console.log('[collectToPool] Proof public signals:', {
                newCommitmentHash: contractProof.pubSignals[0].toString(),
                existingNullifierHash: contractProof.pubSignals[1].toString(),
                depositValue: contractProof.pubSignals[2].toString(),
                stateRoot: contractProof.pubSignals[3].toString(),
                stateTreeDepth: contractProof.pubSignals[4].toString(),
                ASPRoot: contractProof.pubSignals[5].toString(),
                ASPTreeDepth: contractProof.pubSignals[6].toString(),
                context: contractProof.pubSignals[7].toString(),
              })

              // Verify nullifier hash matches
              console.log('[collectToPool] Nullifier verification:', {
                ourNullifier: existingDeposit.nullifier.toString(),
                expectedNullifierHash: expectedNullifierHash.toString(),
                proofNullifierHash: contractProof.pubSignals[1].toString(),
                match: expectedNullifierHash === contractProof.pubSignals[1],
              })

              // Re-verify on-chain roots haven't changed during proof generation
              const [finalStateRoot, finalASPRoot] = await Promise.all([
                readClient.readContract({
                  address: contracts.pool as Address,
                  abi: poolAbi,
                  functionName: 'currentRoot',
                }) as Promise<bigint>,
                readClient.readContract({
                  address: contracts.entrypoint as Address,
                  abi: entrypointAbi,
                  functionName: 'latestRoot',
                }) as Promise<bigint>,
              ])

              if (contractProof.pubSignals[3] !== finalStateRoot) {
                console.error('[collectToPool] STATE ROOT CHANGED during proof generation!', {
                  proofStateRoot: contractProof.pubSignals[3].toString(),
                  currentOnChain: finalStateRoot.toString(),
                })
                throw new Error('State changed during proof generation. Please try again.')
              }

              if (contractProof.pubSignals[5] !== finalASPRoot) {
                console.error('[collectToPool] ASP ROOT CHANGED during proof generation!', {
                  proofASPRoot: contractProof.pubSignals[5].toString(),
                  currentOnChain: finalASPRoot.toString(),
                })
                throw new Error('ASP state changed during proof generation. Please try again.')
              }

              console.log('[collectToPool] Sending mergeDeposit transaction...')

              // CRITICAL: Verify the value we're sending matches the proof
              const proofDepositValue = contractProof.pubSignals[2]
              if (proofDepositValue !== depositAmount) {
                console.error('[collectToPool] DEPOSIT VALUE MISMATCH!', {
                  proofValue: proofDepositValue.toString(),
                  sendingValue: depositAmount.toString(),
                  diff: (proofDepositValue - depositAmount).toString(),
                })
                throw new Error(
                  'Deposit value mismatch - proof generated for different amount. Please try again.'
                )
              }

              console.log('[collectToPool] Transaction values:', {
                depositAmount: depositAmount.toString(),
                proofDepositValue: proofDepositValue.toString(),
                mergeDataHex: mergeData,
                poolScope: poolScope.toString(),
              })

              // Full proof dump for debugging
              console.log(
                '[collectToPool] FULL PROOF DUMP:',
                JSON.stringify(
                  {
                    pA: contractProof.pA.map((p) => p.toString()),
                    pB: contractProof.pB.map((row) => row.map((p) => p.toString())),
                    pC: contractProof.pC.map((p) => p.toString()),
                    pubSignals: contractProof.pubSignals.map((p) => p.toString()),
                  },
                  null,
                  2
                )
              )

              // Final on-chain check: verify nullifier not already spent on the contract
              // This catches any race conditions or stale data from the indexer
              console.log('[collectToPool] Final on-chain nullifier check...')
              const existingNullifierHashForCheck = proof.existingNullifierHash
              const nullifierHashHex = `0x${existingNullifierHashForCheck.toString(16).padStart(64, '0')}`
              try {
                // nullifierHashes(uint256) returns bool (true if spent)
                const isSpentOnChain = await readClient.readContract({
                  address: contracts.pool as Address,
                  abi: [
                    {
                      name: 'nullifierHashes',
                      type: 'function',
                      stateMutability: 'view',
                      inputs: [{ name: '_nullifierHash', type: 'uint256' }],
                      outputs: [{ name: '_spent', type: 'bool' }],
                    },
                  ] as const,
                  functionName: 'nullifierHashes',
                  args: [existingNullifierHashForCheck],
                })
                console.log('[collectToPool] On-chain nullifier check:', {
                  nullifier: nullifierHashHex,
                  spentOnChain: isSpentOnChain,
                })
                if (isSpentOnChain) {
                  throw new Error(
                    'Nullifier already spent on-chain. Your commitment was merged or withdrawn. Please refresh.'
                  )
                }
              } catch (nullifierCheckError) {
                console.warn(
                  '[collectToPool] Failed to check nullifier on-chain (continuing):',
                  nullifierCheckError
                )
              }

              // Submit merge deposit transaction from stealth address
              // Use explicit gas limit to avoid estimation failures masking the real error
              console.log('[collectToPool] Submitting merge deposit transaction...')

              // Double-check registry balance right before simulation
              const finalRegistryCheck = (await readClient.readContract({
                address: galeonRegistry,
                abi: galeonRegistryAbi,
                functionName: 'verifiedBalance',
                args: [
                  payment.stealthAddress as Address,
                  '0x0000000000000000000000000000000000000000' as Address,
                ],
              })) as bigint

              const canDepositCheck = (await readClient.readContract({
                address: galeonRegistry,
                abi: galeonRegistryAbi,
                functionName: 'canDeposit',
                args: [payment.stealthAddress as Address],
              })) as boolean

              console.log('[collectToPool] PRE-SIMULATION REGISTRY CHECK:', {
                stealthAddress: payment.stealthAddress,
                verifiedBalance: formatEther(finalRegistryCheck),
                depositAmount: formatEther(depositAmount),
                canDeposit: canDepositCheck,
                hasEnoughBalance: finalRegistryCheck >= depositAmount,
              })

              if (!canDepositCheck) {
                throw new Error('Registry says canDeposit=false. Address may be frozen.')
              }

              if (finalRegistryCheck < depositAmount) {
                throw new Error(
                  `Registry verified balance (${formatEther(finalRegistryCheck)}) is less than deposit amount (${formatEther(depositAmount)}). Try a smaller amount.`
                )
              }

              // === CRITICAL: Verify proof pubSignals match current on-chain state ===
              // This catches divergence before we waste gas on a doomed transaction
              const [currentStateRoot, currentASPRoot] = await Promise.all([
                readClient.readContract({
                  address: contracts.pool as Address,
                  abi: poolAbi,
                  functionName: 'currentRoot',
                }) as Promise<bigint>,
                readClient.readContract({
                  address: contracts.entrypoint as Address,
                  abi: entrypointAbi,
                  functionName: 'latestRoot',
                }) as Promise<bigint>,
              ])

              const proofStateRoot = contractProof.pubSignals[3]
              const proofASPRoot = contractProof.pubSignals[5]

              console.log('[collectToPool] CRITICAL ROOT CHECK (pre-simulation):', {
                proofStateRoot: proofStateRoot.toString(),
                currentStateRoot: currentStateRoot.toString(),
                stateRootMatch: proofStateRoot === currentStateRoot,
                proofASPRoot: proofASPRoot.toString(),
                currentASPRoot: currentASPRoot.toString(),
                aspRootMatch: proofASPRoot === currentASPRoot,
              })

              if (proofStateRoot !== currentStateRoot) {
                console.error(
                  '[collectToPool] STATE ROOT MISMATCH! Proof was generated with stale state.'
                )
                throw new Error(
                  `State root mismatch: proof has ${proofStateRoot.toString().slice(0, 20)}..., ` +
                    `contract has ${currentStateRoot.toString().slice(0, 20)}.... Please try again.`
                )
              }

              if (proofASPRoot !== currentASPRoot) {
                console.error('[collectToPool] ASP ROOT MISMATCH! ASP tree was updated.')
                throw new Error(
                  `ASP root mismatch: proof has ${proofASPRoot.toString().slice(0, 20)}..., ` +
                    `contract has ${currentASPRoot.toString().slice(0, 20)}.... Wait for ASP sync.`
                )
              }

              // Try to simulate first to get a better error message if it fails
              try {
                await readClient.simulateContract({
                  address: contracts.entrypoint as Address,
                  abi: entrypointAbi,
                  functionName: 'mergeDeposit',
                  args: [mergeData, contractProof, poolScope],
                  value: depositAmount,
                  account: payment.stealthAddress as Address,
                })
                console.log('[collectToPool] Simulation passed!')
              } catch (simError) {
                console.error('[collectToPool] Simulation failed:', simError)
                // Extract revert reason if available
                const simErrMsg = simError instanceof Error ? simError.message : String(simError)

                // Check for known revert reasons and throw
                if (simErrMsg.includes('InvalidProof')) {
                  throw new Error('InvalidProof: ZK proof verification failed on-chain.')
                } else if (simErrMsg.includes('NullifierAlreadySpent')) {
                  throw new Error('NullifierAlreadySpent: This commitment was already spent.')
                } else if (simErrMsg.includes('InsufficientVerifiedBalance')) {
                  throw new Error(
                    'InsufficientVerifiedBalance: Registry has no verified balance for this address.'
                  )
                } else if (simErrMsg.includes('MustDepositFromPort')) {
                  throw new Error(
                    'MustDepositFromPort: Stealth address not authorized (frozen or invalid).'
                  )
                } else if (simErrMsg.includes('UnknownStateRoot')) {
                  throw new Error('UnknownStateRoot: State root not recognized. Wait for sync.')
                } else if (simErrMsg.includes('IncorrectASPRoot')) {
                  throw new Error('IncorrectASPRoot: ASP root mismatch. Wait for sync.')
                } else if (simErrMsg.includes('ContextMismatch')) {
                  throw new Error('ContextMismatch: Context verification failed.')
                }
                // If no known reason, throw with the original message
                throw new Error(`Simulation failed: ${simErrMsg}`)
              }

              // Use Mantle's estimateGas - it returns L1+L2 combined gas requirements
              // Successful tx 0x61d6...872c used gasLimit=2.3B, gasUsed=1.86B
              const estimatedGas = await readClient.estimateGas({
                account: payment.stealthAddress as Address,
                to: contracts.entrypoint as Address,
                data: encodeFunctionData({
                  abi: entrypointAbi,
                  functionName: 'mergeDeposit',
                  args: [mergeData, contractProof, poolScope],
                }),
                value: depositAmount,
              })
              // Add 20% buffer to estimated gas for safety
              const mergeGasLimit = (estimatedGas * 120n) / 100n
              const actualGasCost = mergeGasLimit * gasPrice

              // Verify we have enough for gas (proof is already built with depositAmount, can't change it)
              const requiredBalance = depositAmount + actualGasCost
              if (currentBalance < requiredBalance) {
                throw new Error(
                  `Insufficient balance for merge. Need ${formatEther(requiredBalance)} MNT ` +
                    `(${formatEther(depositAmount)} deposit + ${formatEther(actualGasCost)} gas), ` +
                    `but only have ${formatEther(currentBalance)} MNT. ` +
                    `Try depositing a smaller amount.`
                )
              }

              console.log('[collectToPool] Sending mergeDeposit with estimated gas:', {
                estimatedGas: estimatedGas.toString(),
                gasLimitWithBuffer: mergeGasLimit.toString(),
                actualGasCost: formatEther(actualGasCost),
                gasPrice: gasPrice.toString(),
                depositAmount: formatEther(depositAmount),
                remainingForGas: formatEther(currentBalance - depositAmount),
              })

              hash = await stealthWalletClient.writeContract({
                address: contracts.entrypoint as Address,
                abi: entrypointAbi,
                functionName: 'mergeDeposit',
                args: [mergeData, contractProof, poolScope],
                value: depositAmount,
                gas: mergeGasLimit,
                gasPrice,
              })
            } else {
              // ========== REGULAR DEPOSIT FLOW (first deposit) ==========
              // Find an UNUSED precommitment index (check up to 10 indices)
              let precommitment = await createDepositSecrets(
                masterNullifier,
                masterSecret,
                poolScope,
                depositIndex
              )
              for (let attempts = 0; attempts < 10; attempts++) {
                const isUsed = await readClient.readContract({
                  address: contracts.entrypoint as Address,
                  abi: entrypointAbi,
                  functionName: 'usedPrecommitments',
                  args: [precommitment.hash],
                })
                console.log(
                  `[collectToPool] Checking precommitment index ${depositIndex}: used=${isUsed}`
                )
                if (!isUsed) break
                depositIndex++
                precommitment = await createDepositSecrets(
                  masterNullifier,
                  masterSecret,
                  poolScope,
                  depositIndex
                )
              }

              console.log('[collectToPool] Using precommitment:', {
                hash: precommitment.hash.toString(),
                hashHex: `0x${precommitment.hash.toString(16).padStart(64, '0')}`,
                depositIndex: depositIndex.toString(),
              })

              // Save for immediate context update after tx confirms
              firstDepositPrecommitment = precommitment
              firstDepositIndex = depositIndex

              // Calculate deposit amount
              const roughGasLimit = 200000000n
              const roughGasCost = roughGasLimit * gasPrice
              let roughDepositAmount = currentBalance - roughGasCost

              // Cap by verified balance
              if (roughDepositAmount > registryVerifiedBalance) {
                roughDepositAmount = registryVerifiedBalance
              }

              // Cap by target amount if specified
              if (targetAmount !== undefined) {
                const targetAmountWei = parseEther(targetAmount.toString())
                if (roughDepositAmount > targetAmountWei) {
                  roughDepositAmount = targetAmountWei
                }
              }

              if (roughDepositAmount < minimumDepositAmount) {
                setCollectError(
                  `Amount too low for pool deposit. Minimum is ${formatEther(minimumDepositAmount)} MNT`
                )
                return
              }

              // Estimate gas
              let estimatedGas: bigint
              try {
                estimatedGas = await stealthPublicClient.estimateContractGas({
                  address: contracts.entrypoint as Address,
                  abi: entrypointAbi,
                  functionName: 'deposit',
                  args: [precommitment.hash],
                  value: roughDepositAmount,
                  account: stealthAccount,
                })
              } catch (estimateError) {
                console.error('[collectToPool] Gas estimation failed:', estimateError)
                throw new Error(
                  `Gas estimation failed: ${estimateError instanceof Error ? estimateError.message : 'Unknown error'}`
                )
              }

              const gasLimit = (estimatedGas * 120n) / 100n
              const maxGasCost = gasLimit * gasPrice

              let depositAmount = currentBalance - maxGasCost
              if (depositAmount > registryVerifiedBalance) {
                depositAmount = registryVerifiedBalance
              }
              if (targetAmount !== undefined) {
                const targetAmountWei = parseEther(targetAmount.toString())
                if (depositAmount > targetAmountWei) {
                  depositAmount = targetAmountWei
                }
              }

              if (depositAmount < minimumDepositAmount) {
                throw new Error(
                  `Final deposit amount too low. Minimum is ${formatEther(minimumDepositAmount)} MNT`
                )
              }

              console.log(
                '[collectToPool] Final deposit amount:',
                formatEther(depositAmount),
                'MNT'
              )
              console.log('[collectToPool] Sending deposit transaction...')

              // Call entrypoint.deposit(precommitment) from stealth address
              hash = await stealthWalletClient.writeContract({
                address: contracts.entrypoint as Address,
                abi: entrypointAbi,
                functionName: 'deposit',
                args: [precommitment.hash],
                value: depositAmount,
                gas: gasLimit,
                gasPrice,
              })
            }

            console.log('[collectToPool] Transaction sent:', hash)

            // Update progress to confirming
            setDepositProgress({
              current: paymentIdx + 1,
              total: eligiblePayments.length,
              currentAddress: payment.stealthAddress,
              status: 'confirming',
            })

            // Wait for transaction to be confirmed and check status
            console.log('[collectToPool] Waiting for transaction confirmation...')
            const receipt = await stealthPublicClient.waitForTransactionReceipt({ hash })

            if (receipt.status === 'reverted') {
              throw new Error('Transaction reverted on-chain')
            }
            console.log('[collectToPool] Transaction confirmed! Block:', receipt.blockNumber)

            // Record success
            const depositAmount =
              payment.verifiedBalance > payment.balance ? payment.balance : payment.verifiedBalance
            results.push({
              address: payment.stealthAddress,
              hash,
              success: true,
              amount: depositAmount,
            })
            successfulHashes.push(hash)

            // Remove payment from list immediately
            setPayments((prev) => prev.filter((p) => p.stealthAddress !== payment.stealthAddress))

            // Immediately update pool context (bypasses indexer lag)
            // This allows subsequent deposits to merge correctly without waiting for forceSync
            // Only called after receipt confirms success (status !== 'reverted')
            if (shouldMerge && existingDeposit && newSecrets) {
              // Compute new precommitment hash for merged deposit
              // This mirrors the circuit: precommitment = Poseidon(nullifier, secret)
              const newPrecommitmentHash = await poseidonHash([
                newSecrets.nullifier,
                newSecrets.secret,
              ])
              const mergedDeposit: PoolDeposit = {
                index: existingDeposit.index,
                derivationDepth: existingDeposit.derivationDepth + 1n,
                nullifier: newSecrets.nullifier,
                secret: newSecrets.secret,
                precommitmentHash: newPrecommitmentHash,
                value: existingDeposit.value + depositAmount, // Mirrors circuit: newValue = existingValue + depositValue
                label: existingDeposit.label,
                blockNumber: receipt.blockNumber,
                txHash: hash,
              }
              console.log('[collectToPool] Immediately adding merged deposit to context:', {
                oldValue: formatEther(existingDeposit.value),
                addedValue: formatEther(depositAmount),
                newValue: formatEther(mergedDeposit.value),
                derivationDepth: mergedDeposit.derivationDepth.toString(),
                blockNumber: receipt.blockNumber.toString(),
              })
              addDeposit(mergedDeposit)
              // Track locally for next iteration (bypasses indexer lag)
              localLatestDeposit = mergedDeposit
            } else if (firstDepositPrecommitment) {
              // First deposit (non-merge)
              const newDeposit: PoolDeposit = {
                index: firstDepositIndex,
                derivationDepth: 0n,
                nullifier: firstDepositPrecommitment.nullifier,
                secret: firstDepositPrecommitment.secret,
                precommitmentHash: firstDepositPrecommitment.hash,
                value: depositAmount,
                label: poolScope, // Label is scope for first deposit
                blockNumber: receipt.blockNumber,
                txHash: hash,
              }
              console.log('[collectToPool] Immediately adding first deposit to context:', {
                value: formatEther(newDeposit.value),
                index: newDeposit.index.toString(),
                blockNumber: receipt.blockNumber.toString(),
              })
              addDeposit(newDeposit)
              // Track locally for next iteration (subsequent merges will use this)
              localLatestDeposit = newDeposit
            }

            // Update progress to syncing
            setDepositProgress({
              current: paymentIdx + 1,
              total: eligiblePayments.length,
              currentAddress: payment.stealthAddress,
              status: 'syncing',
            })

            console.log(
              `[collectToPool] Payment ${paymentIdx + 1}/${eligiblePayments.length} complete!`
            )
          } catch (paymentError) {
            // Handle error for this specific payment
            console.error(`[collectToPool] Payment ${paymentIdx + 1} failed:`, paymentError)

            let errMsg = 'Pool deposit failed'
            if (paymentError instanceof Error) {
              errMsg = paymentError.message

              // Check for common contract revert reasons
              if (errMsg.includes('InvalidProof')) {
                errMsg =
                  'Proof verification failed on-chain. The commitment may have been spent or the state root is stale.'
              } else if (errMsg.includes('NullifierAlreadySpent')) {
                errMsg = 'This commitment was already spent.'
              } else if (errMsg.includes('InsufficientVerifiedBalance')) {
                errMsg = 'Insufficient verified balance in registry.'
              } else if (errMsg.includes('MustDepositFromPort')) {
                errMsg = 'Stealth address not authorized for deposits.'
              } else if (errMsg.includes('UnknownStateRoot')) {
                errMsg = 'State root not recognized. Wait for sync.'
              } else if (errMsg.includes('IncorrectASPRoot')) {
                errMsg = 'ASP root mismatch. Wait for sync.'
              } else if (errMsg.includes('ContextMismatch')) {
                errMsg = 'Context verification failed.'
              } else if (errMsg.includes('PoolIsDead')) {
                errMsg = 'Privacy pool has been shut down.'
              } else if (errMsg.includes('User rejected') || errMsg.includes('user rejected')) {
                errMsg = 'Transaction rejected by user.'
              }
            }

            // Record failure
            results.push({
              address: payment.stealthAddress,
              hash: null,
              success: false,
              error: errMsg,
              amount: 0n,
            })

            // Stop processing on first failure
            console.log(
              '[collectToPool] Stopping due to error. Processed',
              paymentIdx,
              'of',
              eligiblePayments.length
            )
            break
          }
        } // End of payment loop

        // Store final results
        setDepositResults(results)
        setDepositProgress(null)

        // Update tx hashes with all successful ones
        if (successfulHashes.length > 0) {
          setCollectTxHashes(successfulHashes)
        }

        // Final sync after all deposits
        if (successfulHashes.length > 0) {
          console.log(
            '[collectToPool] Final sync after',
            successfulHashes.length,
            'successful deposits...'
          )
          await new Promise((resolve) => setTimeout(resolve, 2000))
          await forceSync()
          console.log('[collectToPool] Final sync complete!')

          // Mark receipts as collected in backend (update port totals)
          const successfulAddresses = results.filter((r) => r.success).map((r) => r.address)
          console.log(
            '[collectToPool] Successful addresses to mark as collected:',
            successfulAddresses
          )
          if (successfulAddresses.length > 0) {
            try {
              const markResult = await receiptsApi.markCollected(successfulAddresses)
              console.log('[collectToPool] Marked receipts as collected:', markResult)
              // Invalidate ports query so dashboard sees updated totals
              await queryClient.invalidateQueries({ queryKey: ['ports'] })
              console.log('[collectToPool] Invalidated ports query')
            } catch (err) {
              console.error('[collectToPool] Failed to mark receipts as collected:', err)
            }
          } else {
            console.log('[collectToPool] No successful addresses to mark')
          }
        }

        // Set appropriate error message if there were failures
        const failedResults = results.filter((r) => !r.success)
        if (failedResults.length > 0) {
          const successCount = results.filter((r) => r.success).length
          if (successCount > 0) {
            setCollectError(
              `Deposited ${successCount} of ${results.length} payments. Failed: ${failedResults[0].error}`
            )
          } else {
            setCollectError(failedResults[0].error || 'Pool deposit failed')
          }
        }
      } catch (error) {
        // This catches errors in the setup phase (before the loop)
        console.error('[collectToPool] Pool deposit setup failed:', error)
        setDepositProgress(null)

        let errMsg = 'Pool deposit failed'
        if (error instanceof Error) {
          errMsg = error.message
        }

        console.error('[collectToPool] Error details:', errMsg)
        setCollectError(errMsg)
      } finally {
        setIsDepositingToPool(false)
        setDepositProgress(null)
      }
    },
    [
      masterNullifier,
      masterSecret,
      poolScope,
      publicClient,
      payments,
      chainId,
      deposits,
      forceSync,
      addDeposit,
      queryClient,
    ]
  )

  const totalBalance = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.balance, 0n)
  }, [payments])

  const totalBalanceFormatted = formatBalance(totalBalance)

  const totalVerifiedBalance = useMemo(() => {
    // Cap verified at actual balance (verified can be higher if funds were spent from address)
    return payments.reduce((sum, p) => {
      const cappedVerified = p.verifiedBalance > p.balance ? p.balance : p.verifiedBalance
      return sum + cappedVerified
    }, 0n)
  }, [payments])

  const totalVerifiedBalanceFormatted = formatBalance(totalVerifiedBalance)

  const totalDustBalance = useMemo(() => {
    return dustPayments.reduce((sum, p) => sum + p.balance, 0n)
  }, [dustPayments])

  // Check if any payments can be deposited to pool
  const hasPoolDepositable = payments.some((p) => p.canDepositToPool)

  // Will merge deposit if user has existing deposits
  const willMergeDeposit = deposits.length > 0

  // Gas cost for pool deposits on Mantle (~0.055 MNT per merge deposit)
  const POOL_GAS_COST_PER_DEPOSIT = parseEther('0.055')

  /**
   * Calculate pool deposit stats for a set of payments.
   * This helps the UI show accurate max amounts and which payments can deposit.
   */
  const calculatePoolDepositStats = useCallback((paymentsToCheck: CollectablePayment[]) => {
    const eligible = paymentsToCheck.filter((p) => p.canDepositToPool)
    const minDepositAmount = parseEther('0.001')

    // For each payment, calculate what it can actually deposit
    const paymentStats = eligible.map((p) => {
      const canCoverGas = p.balance >= POOL_GAS_COST_PER_DEPOSIT + minDepositAmount
      const availableAfterGas = canCoverGas ? p.balance - POOL_GAS_COST_PER_DEPOSIT : 0n
      // Cap by verified balance
      const maxDeposit =
        availableAfterGas > p.verifiedBalance ? p.verifiedBalance : availableAfterGas

      return {
        address: p.stealthAddress,
        balance: p.balance,
        canDeposit: canCoverGas,
        maxDeposit,
        shortfall: canCoverGas ? 0n : POOL_GAS_COST_PER_DEPOSIT + minDepositAmount - p.balance,
      }
    })

    const canDeposit = paymentStats.filter((s) => s.canDeposit)
    const tooSmall = paymentStats.filter((s) => !s.canDeposit)
    const totalMaxDeposit = canDeposit.reduce((sum, s) => sum + s.maxDeposit, 0n)

    return {
      totalPayments: eligible.length,
      paymentsCanDeposit: canDeposit.length,
      paymentsTooSmall: tooSmall.length,
      totalMaxDeposit,
      totalMaxDepositFormatted: formatBalance(totalMaxDeposit),
      gasCostPerDeposit: POOL_GAS_COST_PER_DEPOSIT,
      gasCostPerDepositFormatted: formatBalance(POOL_GAS_COST_PER_DEPOSIT),
      paymentStats,
    }
  }, [])

  /**
   * Find the best payment address to use for a specific amount.
   * Returns the smallest address that can cover amount + gas.
   */
  const findBestPaymentForAmount = useCallback(
    (amountWei: bigint, filteredPayments: CollectablePayment[]): CollectablePayment | null => {
      // Gas cost estimate for Mantle L2 (conservative)
      const gasCost = parseEther('0.01') // ~10M gas at low price

      // Filter to addresses that can cover amount + gas
      const eligible = filteredPayments.filter((p) => p.balance > amountWei + gasCost)

      if (eligible.length === 0) return null

      // Sort by balance ascending (smallest first) to find best fit
      const sorted = [...eligible].sort((a, b) => (a.balance < b.balance ? -1 : 1))

      // Return smallest address that can cover the amount
      return sorted[0]
    },
    []
  )

  /**
   * Get a summary of stealth address selection for UI display.
   * Helps user understand which address(es) will be used.
   */
  const getStealthPaySummary = useCallback(
    (
      amountInput: string,
      filteredPayments: CollectablePayment[]
    ): {
      mode: 'single' | 'all' | 'none'
      selectedPayment: CollectablePayment | null
      canSend: boolean
      message: string
      availableAddresses: Array<{ address: string; balance: string; canCover: boolean }>
    } => {
      const gasCost = parseEther('0.01')

      // No payments available
      if (filteredPayments.length === 0) {
        return {
          mode: 'none',
          selectedPayment: null,
          canSend: false,
          message: 'No stealth funds available',
          availableAddresses: [],
        }
      }

      // Build available addresses list
      const availableAddresses = filteredPayments.map((p) => ({
        address: p.stealthAddress,
        balance: p.balanceFormatted,
        canCover: false, // Will be updated below
      }))

      // If no amount specified, send all
      if (!amountInput || amountInput === '') {
        const total = filteredPayments.reduce((sum, p) => sum + p.balance, 0n)
        return {
          mode: 'all',
          selectedPayment: null,
          canSend: true,
          message: `Will send from ${filteredPayments.length} address${filteredPayments.length > 1 ? 'es' : ''} (${formatBalance(total)} MNT total)`,
          availableAddresses,
        }
      }

      // Parse amount
      const amountWei = parseEther(amountInput)

      // Update which addresses can cover the amount
      availableAddresses.forEach((addr, i) => {
        addr.canCover = filteredPayments[i].balance > amountWei + gasCost
      })

      // Find best address
      const bestPayment = findBestPaymentForAmount(amountWei, filteredPayments)

      if (bestPayment) {
        return {
          mode: 'single',
          selectedPayment: bestPayment,
          canSend: true,
          message: `Sending from ${bestPayment.stealthAddress.slice(0, 10)}...${bestPayment.stealthAddress.slice(-8)} (${bestPayment.balanceFormatted} MNT)`,
          availableAddresses,
        }
      }

      // No single address can cover the amount
      const maxSingle = filteredPayments.reduce((max, p) => (p.balance > max ? p.balance : max), 0n)
      const maxSendable = maxSingle > gasCost ? maxSingle - gasCost : 0n

      return {
        mode: 'none',
        selectedPayment: null,
        canSend: false,
        message: `No single address has ${amountInput} MNT. Max from one address: ${formatEther(maxSendable)} MNT`,
        availableAddresses,
      }
    },
    [findBestPaymentForAmount]
  )

  return {
    payments,
    dustPayments,
    totalBalance,
    totalBalanceFormatted,
    totalVerifiedBalance,
    totalVerifiedBalanceFormatted,
    hasPoolDepositable,
    totalDustBalance,
    totalDustBalanceFormatted: formatBalance(totalDustBalance),
    minimumCollectable: MINIMUM_COLLECTABLE_BALANCE,
    minimumCollectableFormatted: formatBalance(MINIMUM_COLLECTABLE_BALANCE),
    isScanning,
    isCollecting,
    isDepositingToPool,
    scanError,
    collectError,
    collectTxHashes,
    scan,
    collectAll,
    collectToPool,
    hasKeys: !!keys && !!masterSignature,
    hasPoolKeys,
    willMergeDeposit,
    existingPoolBalance: deposits.reduce((sum, d) => sum + d.value, 0n),
    // Preflight for pool deposits (sync check)
    preflight,
    isLoadingPreflight,
    runPoolPreflight,
    // Multi-payment deposit progress
    depositProgress,
    depositResults,
    // Pool deposit stats calculator
    calculatePoolDepositStats,
    // Stealth Pay address selection
    findBestPaymentForAmount,
    getStealthPaySummary,
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
