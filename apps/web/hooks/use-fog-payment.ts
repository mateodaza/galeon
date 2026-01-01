'use client'

/**
 * React hook for making payments from fog wallets.
 *
 * Handles:
 * 1. Derive fog private key on-demand
 * 2. Detect recipient type (EOA vs stealth)
 * 3. Prepare payment parameters
 * 4. Send transaction from fog wallet
 */

import { useState, useCallback } from 'react'
import { parseEther, formatEther, keccak256, encodePacked, type Hex } from 'viem'
import { usePublicClient, useAccount } from 'wagmi'
import {
  deriveFogKeys,
  deriveStealthPrivateKey,
  prepareEOAPayment,
  prepareStealthPayment,
} from '@galeon/stealth'
import { useStealthContext } from '@/contexts/stealth-context'
import { useFogContext } from '@/contexts/fog-context'
import { detectRecipientType, getPrivacyWarnings, calculateTimePrivacy } from '@/lib/fog-privacy'
import { bytesToHex } from '@/lib/fog-storage'
import type { FogPaymentResult, RecipientType, PrivacyLevel } from '@/types/fog'

// ============================================================
// Types
// ============================================================

export interface UseFogPaymentReturn {
  /** Execute payment from fog wallet */
  payFromFog: (
    fogIndex: number,
    recipientInput: string,
    amount: string,
    memo?: string
  ) => Promise<FogPaymentResult>
  /**
   * Transfer full balance from a fog wallet to another fog wallet address.
   * Used for adding hops in the multi-hop flow.
   */
  transferToFogWallet: (
    sourceFogIndex: number,
    destinationAddress: `0x${string}`
  ) => Promise<`0x${string}`>
  /** Transfer in progress */
  isTransferring: boolean
  /** Transaction pending in wallet */
  isPending: boolean
  /** Transaction confirming on chain */
  isConfirming: boolean
  /** Transaction hash */
  txHash: `0x${string}` | null
  /** Payment succeeded */
  isSuccess: boolean
  /** Error message */
  error: string | null
  /** Reset state */
  reset: () => void
}

export interface PaymentPreview {
  /** Detected recipient type */
  recipientType: RecipientType
  /** Whether recipient is valid */
  isValid: boolean
  /** Privacy warnings for this payment */
  warnings: string[]
  /** Privacy level for this payment */
  privacyLevel: PrivacyLevel
  /** Formatted amount */
  amountFormatted: string
  /** Is stealth recipient (full privacy) */
  isStealthRecipient: boolean
}

// ============================================================
// Hook
// ============================================================

/**
 * Hook for making payments from fog wallets.
 */
export function useFogPayment(): UseFogPaymentReturn {
  const { masterSignature } = useStealthContext()
  const { fogWallets, refreshBalances } = useFogContext()
  const publicClient = usePublicClient()
  const _account = useAccount() // Address available if needed

  const [isPending, setIsPending] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isTransferring, setIsTransferring] = useState(false)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setIsPending(false)
    setIsConfirming(false)
    setIsTransferring(false)
    setTxHash(null)
    setIsSuccess(false)
    setError(null)
  }, [])

  const payFromFog = useCallback(
    async (
      fogIndex: number,
      recipientInput: string,
      amount: string,
      memo?: string
    ): Promise<FogPaymentResult> => {
      // Reset state
      reset()
      setIsPending(true)

      try {
        // Validate inputs
        if (!masterSignature) {
          throw new Error('Master signature not available - please unlock stealth keys first')
        }

        if (!publicClient) {
          throw new Error('Public client not available')
        }

        const fogWallet = fogWallets.find((w) => w.fogIndex === fogIndex)
        if (!fogWallet) {
          throw new Error(`Fog wallet ${fogIndex} not found`)
        }

        // Parse amount
        const amountWei = parseEther(amount)
        if (amountWei <= 0n) {
          throw new Error('Amount must be greater than 0')
        }

        // Check balance
        if (amountWei > fogWallet.balance) {
          throw new Error(
            `Insufficient balance. Have: ${fogWallet.balanceFormatted} MNT, Need: ${amount} MNT`
          )
        }

        // Detect recipient type
        const recipientType = detectRecipientType(recipientInput)
        if (recipientType === 'invalid') {
          throw new Error('Invalid recipient format. Use 0x address or st:mnt: stealth address')
        }

        // Prepare payment parameters
        let recipient: `0x${string}`
        let isStealthRecipient: boolean
        // These are for future on-chain announcement
        let _ephemeralPublicKey: Uint8Array
        let _viewTag: number

        if (recipientType === 'eoa') {
          const params = prepareEOAPayment(recipientInput as `0x${string}`)
          recipient = params.recipient
          _ephemeralPublicKey = params.ephemeralPublicKey
          _viewTag = params.viewTag
          isStealthRecipient = false
        } else {
          const params = prepareStealthPayment(recipientInput as `st:mnt:0x${string}`)
          recipient = params.recipient
          _ephemeralPublicKey = params.ephemeralPublicKey
          _viewTag = params.viewTag
          isStealthRecipient = true
        }

        // Compute receipt hash (for future on-chain verification)
        const _receiptHash = keccak256(
          encodePacked(['string', 'uint256'], [memo || 'Galeon Fog Payment', amountWei])
        )

        console.log('[Fog Payment] Preparing transaction:', {
          from: fogWallet.stealthAddress,
          to: recipient,
          amount: formatEther(amountWei),
          recipientType,
          isStealthRecipient,
        })

        // Derive fog wallet private key
        const fogKeys = deriveFogKeys(masterSignature, fogIndex, 'mnt')

        // Derive the stealth private key
        // We need the ephemeral public key that was used to create this fog wallet
        const ephemeralPubKeyBytes = hexToBytes(fogWallet.ephemeralPublicKey)
        const { stealthPrivateKey } = deriveStealthPrivateKey(
          ephemeralPubKeyBytes,
          fogKeys.spendingPrivateKey,
          fogKeys.viewingPrivateKey
        )

        // Create wallet client from fog private key
        const { privateKeyToAccount } = await import('viem/accounts')
        const fogAccount = privateKeyToAccount(`0x${bytesToHex(stealthPrivateKey)}` as Hex)

        const { createWalletClient, http } = await import('viem')
        const { mantle } = await import('viem/chains')

        const fogWalletClient = createWalletClient({
          account: fogAccount,
          chain: mantle,
          transport: http('https://rpc.mantle.xyz'),
        })

        // Get gas estimate
        const { createPublicClient } = await import('viem')
        const fogPublicClient = createPublicClient({
          chain: mantle,
          transport: http('https://rpc.mantle.xyz'),
        })

        // Get current gas price
        const gasPrice = await fogPublicClient.getGasPrice()
        console.log('[Fog Payment] Gas price:', gasPrice.toString(), 'wei')

        // For Mantle, use high gas limit due to L1 data costs
        const gasLimit = 85000000n

        // Calculate max gas cost
        const estimatedGasUsed = 60000000n
        const estimatedGasCost = estimatedGasUsed * gasPrice

        // Check if we have enough for payment + gas
        const totalNeeded = amountWei + estimatedGasCost
        if (totalNeeded > fogWallet.balance) {
          throw new Error(
            `Insufficient balance for payment + gas. Have: ${fogWallet.balanceFormatted} MNT, Need: ~${formatEther(totalNeeded)} MNT`
          )
        }

        // Send transaction
        console.log('[Fog Payment] Sending transaction...')
        const hash = await fogWalletClient.sendTransaction({
          to: recipient,
          value: amountWei,
          gas: gasLimit,
          gasPrice,
          type: 'legacy',
        })

        console.log('[Fog Payment] Transaction sent:', hash)
        setTxHash(hash)
        setIsPending(false)
        setIsConfirming(true)

        // Wait for confirmation
        const receipt = await fogPublicClient.waitForTransactionReceipt({ hash })
        console.log('[Fog Payment] Transaction confirmed:', receipt.status)

        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted')
        }

        setIsConfirming(false)
        setIsSuccess(true)

        // Refresh balances after successful payment
        setTimeout(() => refreshBalances(), 2000)

        const privacyLevel = calculateTimePrivacy(fogWallet.fundedAt)

        return {
          txHash: hash,
          recipient,
          amount: amountWei,
          privacyLevel,
          isStealthRecipient,
        }
      } catch (err) {
        console.error('[Fog Payment] Failed:', err)
        const message = err instanceof Error ? err.message : 'Payment failed'
        setError(message)
        setIsPending(false)
        setIsConfirming(false)
        throw err
      }
    },
    [masterSignature, publicClient, fogWallets, refreshBalances, reset]
  )

  /**
   * Transfer full balance (minus gas) from a fog wallet to another address.
   * Used for adding hops in the multi-hop flow.
   */
  const transferToFogWallet = useCallback(
    async (sourceFogIndex: number, destinationAddress: `0x${string}`): Promise<`0x${string}`> => {
      reset()
      setIsTransferring(true)

      try {
        if (!masterSignature) {
          throw new Error('Master signature not available - please unlock stealth keys first')
        }

        const fogWallet = fogWallets.find((w) => w.fogIndex === sourceFogIndex)
        if (!fogWallet) {
          throw new Error(`Fog wallet ${sourceFogIndex} not found`)
        }

        if (fogWallet.balance <= 0n) {
          throw new Error('Source wallet has no balance')
        }

        console.log('[Fog Transfer] Preparing transfer:', {
          from: fogWallet.stealthAddress,
          to: destinationAddress,
          balance: fogWallet.balanceFormatted,
        })

        // Derive fog wallet private key
        const fogKeys = deriveFogKeys(masterSignature, sourceFogIndex, 'mnt')

        // Derive the stealth private key
        const ephemeralPubKeyBytes = hexToBytes(fogWallet.ephemeralPublicKey)
        const { stealthPrivateKey } = deriveStealthPrivateKey(
          ephemeralPubKeyBytes,
          fogKeys.spendingPrivateKey,
          fogKeys.viewingPrivateKey
        )

        // Create wallet client from fog private key
        const { privateKeyToAccount } = await import('viem/accounts')
        const fogAccount = privateKeyToAccount(`0x${bytesToHex(stealthPrivateKey)}` as Hex)

        const { createWalletClient, createPublicClient, http } = await import('viem')
        const { mantle } = await import('viem/chains')

        const fogPublicClient = createPublicClient({
          chain: mantle,
          transport: http('https://rpc.mantle.xyz'),
        })

        const fogWalletClient = createWalletClient({
          account: fogAccount,
          chain: mantle,
          transport: http('https://rpc.mantle.xyz'),
        })

        // Get gas price and estimate gas cost
        const gasPrice = await fogPublicClient.getGasPrice()
        const gasLimit = 60000000n // Conservative gas limit for Mantle
        const estimatedGasCost = gasLimit * gasPrice

        // Calculate amount to transfer (balance - gas)
        const transferAmount = fogWallet.balance - estimatedGasCost
        if (transferAmount <= 0n) {
          throw new Error('Insufficient balance to cover gas costs')
        }

        console.log('[Fog Transfer] Sending:', {
          amount: formatEther(transferAmount),
          gasCost: formatEther(estimatedGasCost),
        })

        // Send transaction
        setIsPending(true)
        const hash = await fogWalletClient.sendTransaction({
          to: destinationAddress,
          value: transferAmount,
          gas: gasLimit,
          gasPrice,
          type: 'legacy',
        })

        console.log('[Fog Transfer] Transaction sent:', hash)
        setTxHash(hash)
        setIsPending(false)
        setIsConfirming(true)

        // Wait for confirmation
        const receipt = await fogPublicClient.waitForTransactionReceipt({ hash })
        console.log('[Fog Transfer] Transaction confirmed:', receipt.status)

        if (receipt.status === 'reverted') {
          throw new Error('Transaction reverted')
        }

        setIsConfirming(false)
        setIsSuccess(true)
        setIsTransferring(false)

        // Refresh balances
        setTimeout(() => refreshBalances(), 2000)

        return hash
      } catch (err) {
        console.error('[Fog Transfer] Failed:', err)
        const message = err instanceof Error ? err.message : 'Transfer failed'
        setError(message)
        setIsPending(false)
        setIsConfirming(false)
        setIsTransferring(false)
        throw err
      }
    },
    [masterSignature, fogWallets, refreshBalances, reset]
  )

  return {
    payFromFog,
    transferToFogWallet,
    isTransferring,
    isPending,
    isConfirming,
    txHash,
    isSuccess,
    error,
    reset,
  }
}

// ============================================================
// Preview Hook
// ============================================================

/**
 * Hook for previewing a payment before sending.
 */
export function usePaymentPreview(
  fogIndex: number | null,
  recipientInput: string,
  amount: string
): PaymentPreview {
  const { fogWallets } = useFogContext()

  const fogWallet = fogIndex !== null ? fogWallets.find((w) => w.fogIndex === fogIndex) : null

  const recipientType = recipientInput.trim() ? detectRecipientType(recipientInput) : 'invalid'
  const isValid = recipientType !== 'invalid'

  // Get privacy warnings
  let warnings: string[] = []
  let privacyLevel: PrivacyLevel = 'high'

  if (fogWallet) {
    try {
      const amountWei = amount ? parseEther(amount) : 0n
      warnings = getPrivacyWarnings(fogWallet, amountWei)
      privacyLevel = calculateTimePrivacy(fogWallet.fundedAt)
    } catch {
      // Invalid amount, ignore
    }
  }

  // Add recipient-type warning
  if (recipientType === 'eoa' && isValid) {
    warnings.unshift('Sending to public address - recipient identity is visible')
  }

  const amountFormatted = amount || '0'

  return {
    recipientType,
    isValid,
    warnings,
    privacyLevel,
    amountFormatted,
    isStealthRecipient: recipientType === 'stealth',
  }
}

// ============================================================
// Utility Functions
// ============================================================

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
  const bytes = new Uint8Array(cleanHex.length / 2)
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16)
  }
  return bytes
}
