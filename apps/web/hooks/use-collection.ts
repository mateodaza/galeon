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
import { formatEther, parseEther, type Hex } from 'viem'
import { CONTRACTS } from '@/lib/contracts'
import { useStealthContext } from '@/contexts/stealth-context'
import { scanAnnouncements, type Announcement } from '@galeon/stealth'

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
  const { keys } = useStealthContext()

  const [payments, setPayments] = useState<CollectablePayment[]>([])
  const [dustPayments, setDustPayments] = useState<CollectablePayment[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isCollecting, setIsCollecting] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [collectError, setCollectError] = useState<string | null>(null)
  const [collectTxHashes, setCollectTxHashes] = useState<`0x${string}`[]>([])

  const contractAddress = useMemo(() => {
    if (!chainId) return null
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS]
    return contracts?.announcer ?? null
  }, [chainId])

  /**
   * Scan for payments belonging to the user.
   */
  const scan = useCallback(async () => {
    if (!publicClient || !keys || !contractAddress) {
      setScanError('Missing required context')
      return
    }

    setIsScanning(true)
    setScanError(null)

    try {
      // ============================================================
      // TODO [BACKEND_SWAP]: Replace getLogs with:
      // const res = await fetch(`/api/announcements?chainId=${chainId}`)
      // const logs = await res.json()
      // Keep the scanAnnouncements() call - it needs private keys
      // ============================================================

      // Start from deployment block (first block before all Galeon contracts)
      // Using Alchemy RPC allows reading full block range without 50k limit
      const deploymentBlock = 89365202n

      // Fetch Announcement events
      const logs = await publicClient.getLogs({
        address: contractAddress,
        event: {
          type: 'event',
          name: 'Announcement',
          inputs: [
            { name: 'schemeId', type: 'uint256', indexed: true },
            { name: 'stealthAddress', type: 'address', indexed: true },
            { name: 'caller', type: 'address', indexed: true },
            { name: 'ephemeralPubKey', type: 'bytes', indexed: false },
            { name: 'metadata', type: 'bytes', indexed: false },
          ],
        },
        fromBlock: deploymentBlock,
        toBlock: 'latest',
      })

      // Convert logs to Announcement format
      const announcements: Announcement[] = logs.map((log) => {
        const args = log.args as {
          schemeId: bigint
          stealthAddress: `0x${string}`
          caller: `0x${string}`
          ephemeralPubKey: `0x${string}`
          metadata: `0x${string}`
        }

        return {
          stealthAddress: args.stealthAddress,
          ephemeralPubKey: hexToBytes(args.ephemeralPubKey),
          metadata: hexToBytes(args.metadata),
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
        }
      })

      // Scan for payments belonging to us
      const scannedPayments = scanAnnouncements(
        announcements,
        keys.spendingPrivateKey,
        keys.viewingPrivateKey
      )

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
      console.error('Scan failed:', error)
      setScanError(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }, [publicClient, keys, contractAddress])

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
          console.log(`\n--- Processing payment ${i + 1}/${payments.length} ---`)
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
          console.log('Current on-chain balance:', formatEther(currentBalance), 'MNT')

          // Check if already collected (balance is now 0 or very low)
          if (currentBalance < parseEther('0.0001')) {
            console.log(`Skipping ${payment.stealthAddress}: already collected or empty`)
            setCollectError('Already collected or balance too low')
            continue
          }

          // Get current nonce for the transaction
          const nonce = await stealthPublicClient.getTransactionCount({
            address: payment.stealthAddress,
          })
          console.log('Current nonce:', nonce)

          // Reserve small amount for gas (Mantle gas is very cheap ~0.02 gwei)
          const gasReserve = parseEther('0.00005')
          const amountToSend = currentBalance - gasReserve

          console.log('Collection details:', {
            from: payment.stealthAddress,
            to: toAddress,
            balance: formatEther(currentBalance),
            amountToSend: formatEther(amountToSend),
            gasReserve: formatEther(gasReserve),
            nonce,
          })

          if (amountToSend <= 0n) {
            console.log(`Skipping ${payment.stealthAddress}: balance too low for gas`)
            setCollectError(`Balance too low (${formatEther(currentBalance)} MNT)`)
            continue
          }

          // Get gas price for legacy transaction
          const gasPrice = await stealthPublicClient.getGasPrice()
          console.log('Gas price:', gasPrice.toString(), 'wei')

          // Send as legacy transaction with high gas limit for Mantle L2
          // Mantle requires ~58.5M gas for L1 data costs (verified from successful tx)
          // Gas limit must be higher than used, but only used amount is charged
          const gasLimit = 85000000n // 85M gas limit
          const estimatedGasUsed = 60000000n // ~60M actually used (58.5M + buffer)
          const estimatedGasCost = estimatedGasUsed * gasPrice

          console.log('Estimated gas cost:', formatEther(estimatedGasCost), 'MNT')

          // Minimum balance: gas cost + something to send
          const minBalance = estimatedGasCost + parseEther('0.0001')
          if (currentBalance < minBalance) {
            console.log(`Skipping ${payment.stealthAddress}: balance too low for Mantle L1 gas`)
            setCollectError(
              `Balance too low. Mantle L1 gas costs ~${formatEther(estimatedGasCost)} MNT. Have: ${formatEther(currentBalance)} MNT, Need: ~${formatEther(minBalance)} MNT`
            )
            continue
          }

          // Send balance minus estimated gas (excess gas refunded by network)
          const properAmountToSend = currentBalance - estimatedGasCost

          console.log('Sending legacy transaction with high gas limit...')
          const hash = await stealthWalletClient.sendTransaction({
            to: toAddress,
            value: properAmountToSend,
            gas: gasLimit,
            gasPrice,
            type: 'legacy',
          })
          console.log('Transaction sent:', hash)

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
    hasKeys: !!keys,
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
