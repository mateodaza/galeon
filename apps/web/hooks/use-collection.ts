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
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { formatEther, parseEther, type Hex, keccak256, stringToBytes, type Address } from 'viem'
import { useStealthContext } from '@/contexts/stealth-context'
import { usePoolContext } from '@/contexts/pool-context'
import { scanAnnouncements, derivePortKeys, type Announcement } from '@galeon/stealth'
import { createDepositSecrets, POOL_CONTRACTS, entrypointAbi } from '@galeon/pool'
import { announcementsApi, portsApi, registryApi } from '@/lib/api'
import { isSupportedChain, getStealthContracts, galeonRegistryAbi } from '@/lib/contracts'

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
  /** Verified balance from GaleonRegistry - max amount that can be deposited to pool */
  verifiedBalance: bigint
  verifiedBalanceFormatted: string
  /** Whether this payment can be deposited to the privacy pool */
  canDepositToPool: boolean
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
  const { masterNullifier, masterSecret, poolScope, hasPoolKeys, deposits, recoverDeposits } =
    usePoolContext()

  const [payments, setPayments] = useState<CollectablePayment[]>([])
  const [dustPayments, setDustPayments] = useState<CollectablePayment[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [isDepositingToPool, setIsDepositingToPool] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [collectError, setCollectError] = useState<string | null>(null)
  const [collectTxHashes, setCollectTxHashes] = useState<`0x${string}`[]>([])

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
            balanceFormatted: formatEther(balance),
            verifiedBalance,
            verifiedBalanceFormatted: formatEther(verifiedBalance),
            canDepositToPool,
            token: payment.token,
            receiptHash: payment.receiptHash,
            txHash: payment.txHash,
            blockNumber: payment.blockNumber,
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
   * Collect payments to a recipient address.
   * @param recipient - Optional recipient address (defaults to connected wallet)
   * @param targetAmount - Optional target amount to send (defaults to ALL funds from all addresses)
   *                       When specified, processes ONE stealth address at a time
   */
  const collectAll = useCallback(
    async (recipient?: `0x${string}`, targetAmount?: number) => {
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

      // If target amount specified, only process ONE payment (highest balance first)
      const paymentsToProcess =
        targetAmount !== undefined
          ? [...payments].sort((a, b) => (b.balance > a.balance ? 1 : -1)).slice(0, 1)
          : payments

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

  /**
   * Deposit a payment to the privacy pool.
   * Processes ONE payment at a time for safety (avoids precommitment collisions).
   * @param targetAmount - Optional target amount to deposit (defaults to max verified)
   */
  const collectToPool = useCallback(
    async (targetAmount?: number) => {
      console.log('[collectToPool] Starting pool deposit...', { targetAmount })
      console.log('[collectToPool] Pool keys:', {
        hasMasterNullifier: !!masterNullifier,
        hasMasterSecret: !!masterSecret,
        poolScope: poolScope?.toString(),
      })

      if (!masterNullifier || !masterSecret || !poolScope) {
        setCollectError('Pool keys not derived. Please sign in to the pool first.')
        return
      }
      if (!publicClient || payments.length === 0) {
        setCollectError('No payments to deposit')
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
        const rpcUrl = 'https://rpc.mantle.xyz'

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

        // Find the FIRST eligible payment with verified balance
        // Process only ONE payment per call to avoid precommitment collisions
        const eligiblePayments = payments.filter(
          (p) => p.canDepositToPool && p.verifiedBalance > 0n
        )
        if (eligiblePayments.length === 0) {
          setCollectError(
            'No eligible payments for pool deposit. Payments must go through GaleonRegistry.'
          )
          return
        }

        // Sort by verified balance (highest first) to maximize deposit
        eligiblePayments.sort((a, b) => (b.verifiedBalance > a.verifiedBalance ? 1 : -1))
        const payment = eligiblePayments[0]
        console.log('[collectToPool] Selected payment for deposit:', {
          stealthAddress: payment.stealthAddress,
          balance: formatEther(payment.balance),
          verifiedBalance: formatEther(payment.verifiedBalance),
        })

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
          setCollectError('Verified balance is 0. This payment may have already been deposited.')
          return
        }

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
          depositIndex: depositIndex.toString(),
        })

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
        console.log('[collectToPool] Current on-chain balance:', formatEther(currentBalance), 'MNT')

        if (currentBalance < parseEther('0.0001')) {
          setCollectError('Balance too low (already collected?)')
          return
        }

        // Get gas price
        const gasPrice = await stealthPublicClient.getGasPrice()
        console.log('[collectToPool] Gas price:', gasPrice.toString())

        // Calculate rough deposit amount for gas estimation
        const roughGasLimit = 200000000n
        const roughGasCost = roughGasLimit * gasPrice
        let roughDepositAmount = currentBalance - roughGasCost

        // Cap by verified balance (can't deposit more than verified)
        if (roughDepositAmount > registryVerifiedBalance) {
          roughDepositAmount = registryVerifiedBalance
          console.log(
            '[collectToPool] Capped rough deposit by verified balance:',
            formatEther(roughDepositAmount),
            'MNT'
          )
        }

        // Cap by target amount if specified
        if (targetAmount !== undefined) {
          const targetAmountWei = parseEther(targetAmount.toString())
          if (roughDepositAmount > targetAmountWei) {
            roughDepositAmount = targetAmountWei
            console.log(
              '[collectToPool] Capped rough deposit by target amount:',
              formatEther(roughDepositAmount),
              'MNT'
            )
          }
        }

        if (roughDepositAmount < minimumDepositAmount) {
          setCollectError(
            `Amount too low for pool deposit. Minimum is ${formatEther(minimumDepositAmount)} MNT`
          )
          return
        }

        // Estimate gas for the deposit transaction
        console.log(
          '[collectToPool] Estimating gas with deposit amount:',
          formatEther(roughDepositAmount),
          'MNT'
        )
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
          console.log('[collectToPool] Estimated gas:', estimatedGas.toString())
        } catch (estimateError) {
          console.error('[collectToPool] Gas estimation failed:', estimateError)
          const errMsg =
            estimateError instanceof Error ? estimateError.message : 'Gas estimation failed'
          setCollectError(`Gas estimation failed: ${errMsg}`)
          return
        }

        // Add 20% buffer to estimated gas
        const gasLimit = (estimatedGas * 120n) / 100n
        const maxGasCost = gasLimit * gasPrice
        console.log(
          '[collectToPool] Gas limit:',
          gasLimit.toString(),
          'Max gas cost:',
          formatEther(maxGasCost),
          'MNT'
        )

        // Calculate final deposit amount
        let depositAmount = currentBalance - maxGasCost

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
          setCollectError(
            `Final deposit amount (${formatEther(depositAmount)} MNT) is below minimum (${formatEther(minimumDepositAmount)} MNT)`
          )
          return
        }

        console.log('[collectToPool] Final deposit amount:', formatEther(depositAmount), 'MNT')
        console.log('[collectToPool] Sending deposit transaction...')

        // Call entrypoint.deposit(precommitment) from stealth address
        const hash = await stealthWalletClient.writeContract({
          address: contracts.entrypoint as Address,
          abi: entrypointAbi,
          functionName: 'deposit',
          args: [precommitment.hash],
          value: depositAmount,
          gas: gasLimit,
          gasPrice,
        })
        console.log('[collectToPool] Transaction sent:', hash)

        // Update state with successful deposit
        setCollectTxHashes([hash])
        setPayments((prev) => prev.filter((p) => p.stealthAddress !== payment.stealthAddress))
        console.log('[collectToPool] Successfully deposited', formatEther(depositAmount), 'MNT')

        // Recover pool deposits to update pool balance in navbar
        try {
          console.log('[collectToPool] Recovering pool deposits to update balance...')
          await recoverDeposits()
        } catch (err) {
          console.warn('[collectToPool] Failed to recover deposits (non-fatal):', err)
        }
      } catch (error) {
        console.error('[collectToPool] Pool deposit failed:', error)
        const errMsg = error instanceof Error ? error.message : 'Pool deposit failed'
        console.error('[collectToPool] Error details:', errMsg)
        setCollectError(errMsg)
      } finally {
        setIsDepositingToPool(false)
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
      recoverDeposits,
    ]
  )

  const totalBalance = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.balance, 0n)
  }, [payments])

  const totalBalanceFormatted = formatEther(totalBalance)

  const totalVerifiedBalance = useMemo(() => {
    return payments.reduce((sum, p) => sum + p.verifiedBalance, 0n)
  }, [payments])

  const totalVerifiedBalanceFormatted = formatEther(totalVerifiedBalance)

  const totalDustBalance = useMemo(() => {
    return dustPayments.reduce((sum, p) => sum + p.balance, 0n)
  }, [dustPayments])

  // Check if any payments can be deposited to pool
  const hasPoolDepositable = payments.some((p) => p.canDepositToPool)

  return {
    payments,
    dustPayments,
    totalBalance,
    totalBalanceFormatted,
    totalVerifiedBalance,
    totalVerifiedBalanceFormatted,
    hasPoolDepositable,
    totalDustBalance,
    totalDustBalanceFormatted: formatEther(totalDustBalance),
    minimumCollectable: MINIMUM_COLLECTABLE_BALANCE,
    minimumCollectableFormatted: formatEther(MINIMUM_COLLECTABLE_BALANCE),
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
