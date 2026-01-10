'use client'

/**
 * Withdraw Modal for Privacy Pool
 *
 * Allows users to withdraw MNT from the privacy pool with ZK proof.
 * Improved UX: Enter total amount, auto-selects deposits, chains multiple txs.
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { parseEther, formatEther, isAddress, encodeAbiParameters, type Address } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import {
  Loader2,
  Shield,
  AlertCircle,
  Check,
  ArrowUpRight,
  Sparkles,
  Lock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { usePoolContext, type PoolDeposit } from '@/contexts/pool-context'
import { merkleLeavesApi, aspApi, healthApi, type PreflightResult } from '@/lib/api'
import {
  computeCommitmentHash,
  createWithdrawalSecrets,
  PoolMerkleTree,
  generateWithdrawalProof,
  formatProofForContract,
  computeWithdrawalContext,
  poseidonHash,
  type WithdrawalProofInput,
} from '@galeon/pool'
import { entrypointAbi, poolAbi } from '@galeon/config'

// Relayer API URL (same as main API)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

interface RelayerQuote {
  baseFeeBPS: number
  feeBPS: number
  feeRecipient: string
  estimatedGas: string
  gasPrice: string
}

interface WithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (txHash: `0x${string}`) => void
}

type Step = 'amount' | 'recipient' | 'review' | 'executing' | 'success'

interface WithdrawalPlan {
  deposit: PoolDeposit
  withdrawAmount: bigint
  isPartial: boolean
}

/** Empty ASP root (Poseidon hash of empty set) - kept for reference */
const _EMPTY_ASP_ROOT = BigInt(
  '21663839004416932945382355908790599225266501822907911457504978515578255421292'
)

/**
 * Translate contract/technical errors to user-friendly messages
 */
function translateError(message: string): {
  title: string
  description: string
  canRetry: boolean
} {
  if (message.includes('InvalidProof')) {
    return {
      title: 'Proof Verification Failed',
      description: 'The ZK proof could not be verified. This may indicate a circuit mismatch.',
      canRetry: false,
    }
  }
  if (message.includes('UnknownStateRoot')) {
    return {
      title: 'State Not Synced',
      description:
        'Waiting for the pool state to sync. Please wait and try again in a few seconds.',
      canRetry: true,
    }
  }
  if (message.includes('IncorrectASPRoot')) {
    return {
      title: 'Approval Not Synced',
      description: 'Your deposit approval is syncing. Please wait 15 seconds and try again.',
      canRetry: true,
    }
  }
  if (message.includes('ContextMismatch')) {
    return {
      title: 'Context Mismatch',
      description: 'Transaction data does not match proof. Please try again.',
      canRetry: true,
    }
  }
  if (message.includes('InvalidTreeDepth')) {
    return {
      title: 'Tree Configuration Error',
      description: 'The tree depth exceeds the maximum allowed.',
      canRetry: false,
    }
  }
  if (message.includes('InvalidProcessooor')) {
    return {
      title: 'Invalid Processor',
      description: 'The processor address is incorrect.',
      canRetry: false,
    }
  }
  if (message.includes('NullifierAlreadyUsed') || message.includes('NullifierSpent')) {
    return {
      title: 'Already Withdrawn',
      description: 'This deposit has already been withdrawn or merged.',
      canRetry: false,
    }
  }
  if (message.includes('User rejected') || message.includes('user rejected')) {
    return {
      title: 'Transaction Cancelled',
      description: 'You cancelled the transaction.',
      canRetry: true,
    }
  }
  if (message.includes('State tree mismatch')) {
    return {
      title: 'State Syncing',
      description: 'The pool state is still syncing. Please wait a few seconds and try again.',
      canRetry: true,
    }
  }
  if (message.includes('ASP service not ready')) {
    return {
      title: 'Approval Service Starting',
      description: 'The approval service is initializing. Please wait and try again.',
      canRetry: true,
    }
  }
  if (message.includes('needs funding')) {
    return {
      title: 'Relayer Needs Funding',
      description: 'The relayer account needs to be funded. Please contact support.',
      canRetry: false,
    }
  }

  // Default fallback
  return {
    title: 'Withdrawal Failed',
    description: message,
    canRetry: true,
  }
}

/**
 * Compute optimal withdrawal plan using greedy algorithm.
 * Returns list of (deposit, amount) pairs to withdraw.
 */
function computeWithdrawalPlan(deposits: PoolDeposit[], targetAmount: bigint): WithdrawalPlan[] {
  if (targetAmount <= 0n) return []

  // Sort deposits by value descending (greedy: use largest first)
  const sorted = [...deposits].sort((a, b) => (b.value > a.value ? 1 : -1))

  const plan: WithdrawalPlan[] = []
  let remaining = targetAmount

  for (const deposit of sorted) {
    if (remaining <= 0n) break

    if (deposit.value <= remaining) {
      // Use entire deposit
      plan.push({ deposit, withdrawAmount: deposit.value, isPartial: false })
      remaining -= deposit.value
    } else {
      // Partial withdrawal from this deposit
      plan.push({ deposit, withdrawAmount: remaining, isPartial: true })
      remaining = 0n
    }
  }

  return plan
}

export function WithdrawModal({ open, onOpenChange, onSuccess }: WithdrawModalProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { deposits, totalBalance, masterNullifier, masterSecret, poolScope, contracts, forceSync } =
    usePoolContext()

  const [step, setStep] = useState<Step>('amount')
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [txHashes, setTxHashes] = useState<`0x${string}`[]>([])
  const [currentTxIndex, setCurrentTxIndex] = useState(0)
  const [proofProgress, setProofProgress] = useState<string>('')

  // Relayer state
  const [useRelayer, setUseRelayer] = useState(true) // Default to private
  const [relayerQuote, setRelayerQuote] = useState<RelayerQuote | null>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)

  // Pre-flight state
  const [preflight, setPreflight] = useState<PreflightResult | null>(null)
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(false)
  const [preflightError, setPreflightError] = useState<string | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)

  const parsedAmount = withdrawAmount ? parseEther(withdrawAmount) : 0n
  const isValidAmount = parsedAmount > 0n && parsedAmount <= totalBalance
  const isValidRecipient = isAddress(recipient)

  // Compute withdrawal plan based on amount
  const withdrawalPlan = useMemo(() => {
    if (!isValidAmount) return []
    return computeWithdrawalPlan(deposits, parsedAmount)
  }, [deposits, parsedAmount, isValidAmount])

  const totalTxCount = withdrawalPlan.length

  const resetModal = useCallback(() => {
    setStep('amount')
    setWithdrawAmount('')
    setRecipient('')
    setError(null)
    setTxHashes([])
    setCurrentTxIndex(0)
    setProofProgress('')
    setRelayerQuote(null)
    setPreflight(null)
    setIsLoadingPreflight(false)
    setPreflightError(null)
    setRetryCountdown(null)
  }, [])

  // Fetch relayer quote when amount changes and relayer is enabled
  useEffect(() => {
    if (!useRelayer || !isValidAmount || parsedAmount === 0n) {
      setRelayerQuote(null)
      return
    }

    const fetchQuote = async () => {
      setIsLoadingQuote(true)
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/relayer/quote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: 5000, // Mantle
            amount: parsedAmount.toString(),
            asset: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          }),
        })

        if (response.ok) {
          const quote = await response.json()
          setRelayerQuote(quote)
        } else {
          console.warn('[Withdraw] Failed to fetch relayer quote')
          setRelayerQuote(null)
        }
      } catch (err) {
        console.error('[Withdraw] Relayer quote error:', err)
        setRelayerQuote(null)
      } finally {
        setIsLoadingQuote(false)
      }
    }

    // Debounce the fetch
    const timer = setTimeout(fetchQuote, 500)
    return () => clearTimeout(timer)
  }, [useRelayer, isValidAmount, parsedAmount])

  // Run preflight check when entering review step
  const runPreflightCheck = useCallback(async () => {
    if (!contracts || !withdrawalPlan.length) return

    setIsLoadingPreflight(true)
    setPreflightError(null)
    setRetryCountdown(null)

    try {
      // Use the first deposit's label for preflight check
      const firstDeposit = withdrawalPlan[0].deposit
      const result = await healthApi.preflight('privatesend', {
        poolAddress: contracts.pool,
        depositLabel: firstDeposit.label.toString(),
      })

      setPreflight(result)

      if (!result.canProceed && result.retryAfterMs) {
        // Start countdown timer
        setRetryCountdown(Math.ceil(result.retryAfterMs / 1000))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Preflight check failed'
      setPreflightError(message)
    } finally {
      setIsLoadingPreflight(false)
    }
  }, [contracts, withdrawalPlan])

  // Countdown timer for retry
  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return

    const timer = setTimeout(() => {
      setRetryCountdown(retryCountdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [retryCountdown])

  // Auto-retry preflight when countdown reaches 0
  useEffect(() => {
    if (retryCountdown === 0 && step === 'review') {
      runPreflightCheck()
    }
  }, [retryCountdown, step, runPreflightCheck])

  // Run preflight when entering review step
  useEffect(() => {
    if (step === 'review') {
      runPreflightCheck()
    }
  }, [step, runPreflightCheck])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetModal()
      }
      onOpenChange(open)
    },
    [onOpenChange, resetModal]
  )

  /**
   * Execute a single withdrawal from one deposit
   */
  const executeWithdrawal = useCallback(
    async (
      plan: WithdrawalPlan,
      allCommitments: bigint[],
      childIndex: bigint
    ): Promise<`0x${string}`> => {
      if (!contracts || !publicClient || !walletClient || !address) {
        throw new Error('Missing required data')
      }
      if (!masterNullifier || !masterSecret || !poolScope) {
        throw new Error('Pool keys not available')
      }

      const { deposit, withdrawAmount: amount } = plan

      // 1. Compute our commitment hash
      const ourCommitmentHash = await computeCommitmentHash(
        deposit.value,
        deposit.label,
        deposit.precommitmentHash
      )

      // Verify our commitment is in the list
      const ourIndex = allCommitments.findIndex((c) => c === ourCommitmentHash)

      console.log('[Withdraw] Commitment lookup debug:')
      console.log('  Our computed commitment:', ourCommitmentHash.toString())
      console.log('  Deposit value:', deposit.value.toString())
      console.log('  Deposit label:', deposit.label.toString())
      console.log('  Deposit precommitmentHash:', deposit.precommitmentHash.toString())
      console.log('  Found at index:', ourIndex)
      console.log('  Total commitments:', allCommitments.length)

      if (ourIndex === -1) {
        // Debug: Look for similar commitments
        console.error('[Withdraw] Commitment not found! First 5 commitments in pool:')
        allCommitments.slice(0, 5).forEach((c, i) => console.log(`  ${i}: ${c.toString()}`))
        throw new Error('Deposit commitment not found in pool state')
      }

      // 3. Build Merkle tree
      const tree = await PoolMerkleTree.create(allCommitments)

      // 4. Get state root and depth
      const [stateRoot, stateTreeDepth] = await Promise.all([
        publicClient.readContract({
          address: contracts.pool as Address,
          abi: poolAbi,
          functionName: 'currentRoot',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: contracts.pool as Address,
          abi: poolAbi,
          functionName: 'currentTreeDepth',
        }) as Promise<bigint>,
      ])

      // DEBUG: Check if local tree matches on-chain state
      console.log('[Withdraw] State tree debug:')
      console.log('  Local tree root:', tree.root.toString())
      console.log('  On-chain root:', stateRoot.toString())
      console.log('  Roots match:', tree.root === stateRoot)
      console.log('  Local tree size:', tree.size)
      console.log('  On-chain depth:', stateTreeDepth.toString())
      console.log('  Local tree depth:', tree.depth)
      console.log('  Commitments count:', allCommitments.length)
      console.log(
        '  First 3 commitments:',
        allCommitments.slice(0, 3).map((c) => c.toString())
      )
      console.log(
        '  Last 3 commitments:',
        allCommitments.slice(-3).map((c) => c.toString())
      )

      if (tree.root !== stateRoot) {
        console.error('[Withdraw] CRITICAL: Local tree root does not match on-chain root!')
        console.error('  This means the indexer has different deposits than on-chain.')
        throw new Error(
          `State tree mismatch: local root ${tree.root.toString()} !== on-chain ${stateRoot.toString()}`
        )
      }

      // 5. Fetch ASP proof from backend API
      // The ASP service maintains the full tree and publishes root on-chain
      console.log('[Withdraw] Fetching ASP proof for label:', deposit.label.toString())

      let aspProof: { root: bigint; index: bigint; siblings: bigint[]; depth: number }
      try {
        aspProof = await aspApi.getProof(deposit.label.toString())
        console.log('[Withdraw] ASP proof fetched successfully')
        console.log('  ASP Root:', aspProof.root.toString())
        console.log('  ASP Depth:', aspProof.depth)
      } catch (aspError) {
        // If ASP API fails, provide helpful error message
        console.error('[Withdraw] Failed to fetch ASP proof:', aspError)
        throw new Error(
          'ASP service not ready. The ASP tree may not have been initialized yet. ' +
            'Try triggering a rebuild via the API or wait for the scheduled job to run.'
        )
      }

      const aspRoot = aspProof.root

      // 6. Generate state proof
      const stateProof = tree.generateProof(ourCommitmentHash)

      // 7. Generate new secrets for remaining balance
      const newSecrets = await createWithdrawalSecrets(
        masterNullifier,
        masterSecret,
        deposit.label,
        childIndex
      )

      // 8. Compute new commitment for remaining balance (used internally by proof generation)
      const newPrecommitment = await poseidonHash([newSecrets.nullifier, newSecrets.secret])
      const newValue = deposit.value - amount
      // Note: newCommitmentHash is computed by the circuit and included in proof.pubSignals[0]
      const _newCommitmentHash =
        newValue > 0n ? await computeCommitmentHash(newValue, deposit.label, newPrecommitment) : 0n

      // 9. Encode relay data first (needed for context computation)
      // When using relayer: feeRecipient = relayer address, feeBPS = quoted fee
      // When direct: feeRecipient = user (self), feeBPS = 0
      const feeRecipient =
        useRelayer && relayerQuote ? (relayerQuote.feeRecipient as Address) : address
      const relayFeeBPS = useRelayer && relayerQuote ? BigInt(relayerQuote.feeBPS) : 0n

      const relayData = encodeAbiParameters(
        [
          { name: 'recipient', type: 'address' },
          { name: 'feeRecipient', type: 'address' },
          { name: 'relayFeeBPS', type: 'uint256' },
        ],
        [recipient as Address, feeRecipient, relayFeeBPS]
      )

      // 10. Compute context: keccak256(abi.encode(withdrawal, SCOPE)) % SNARK_SCALAR_FIELD
      const withdrawalForContext = {
        processooor: contracts.entrypoint as `0x${string}`,
        data: relayData as `0x${string}`,
      }
      const context = await computeWithdrawalContext(withdrawalForContext, poolScope)

      console.log('[Withdraw] Debug info:')
      console.log('  Pool scope:', poolScope.toString())
      console.log('  State root:', stateRoot.toString())
      console.log('  State tree depth:', stateTreeDepth.toString())
      console.log('  ASP root:', aspRoot.toString())
      console.log('  ASP tree depth:', aspProof.depth)
      console.log('  Context:', context.toString())
      console.log('  Processooor:', contracts.entrypoint)
      console.log('  RelayData (full):', relayData)
      console.log('  Recipient:', recipient)
      console.log('  Fee recipient:', address)

      // 11. Build proof input
      const proofInput: WithdrawalProofInput = {
        withdrawnValue: amount,
        stateRoot,
        stateTreeDepth: Number(stateTreeDepth),
        ASPRoot: aspRoot,
        ASPTreeDepth: aspProof.depth,
        context,
        label: deposit.label,
        existingValue: deposit.value,
        existingNullifier: deposit.nullifier,
        existingSecret: deposit.secret,
        newNullifier: newSecrets.nullifier,
        newSecret: newSecrets.secret,
        stateSiblings: stateProof.siblings,
        stateIndex: stateProof.index,
        ASPSiblings: aspProof.siblings,
        ASPIndex: aspProof.index,
      }

      // 11. Generate ZK proof
      const proof = await generateWithdrawalProof(proofInput, undefined, (status) => {
        if (status.stage === 'computing' && status.message) {
          setProofProgress(status.message)
        }
      })

      // === RAW SNARKJS OUTPUT DIAGNOSTIC ===
      console.log('=== RAW SNARKJS OUTPUT ===')
      console.log('RAW proof.publicSignals:', proof.publicSignals)
      console.log('RAW publicSignals.length:', proof.publicSignals.length)
      console.log(
        'RAW publicSignals types:',
        proof.publicSignals.map((s, i) => `[${i}]: ${typeof s}`)
      )
      // === END RAW DIAGNOSTIC ===

      // 12. Format and submit
      const formattedProof = formatProofForContract(proof)

      console.log('[Withdraw] Proof public signals:')
      console.log('  [0] newCommitmentHash:', formattedProof.publicSignals[0]?.toString())
      console.log('  [1] existingNullifierHash:', formattedProof.publicSignals[1]?.toString())
      console.log('  [2] withdrawnValue:', formattedProof.publicSignals[2]?.toString())
      console.log('  [3] stateRoot:', formattedProof.publicSignals[3]?.toString())
      console.log('  [4] stateTreeDepth:', formattedProof.publicSignals[4]?.toString())
      console.log('  [5] ASPRoot:', formattedProof.publicSignals[5]?.toString())
      console.log('  [6] ASPTreeDepth:', formattedProof.publicSignals[6]?.toString())
      console.log('  [7] context:', formattedProof.publicSignals[7]?.toString())

      // Cross-verify: do the proof public signals match our inputs?
      console.log('[Withdraw] Cross-verification:')
      console.log(
        '  stateRoot matches input:',
        formattedProof.publicSignals[3]?.toString() === stateRoot.toString()
      )
      console.log(
        '  ASPRoot matches input:',
        formattedProof.publicSignals[5]?.toString() === aspRoot.toString()
      )
      console.log(
        '  context matches input:',
        formattedProof.publicSignals[7]?.toString() === context.toString()
      )
      console.log(
        '  withdrawnValue matches input:',
        formattedProof.publicSignals[2]?.toString() === amount.toString()
      )

      // Withdrawal struct only has processooor and data (nullifierHash/newCommitment are in proof pubSignals)
      const withdrawal = {
        processooor: contracts.entrypoint as Address,
        data: relayData,
      }

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

      console.log('[Withdraw] Using relayer:', useRelayer)
      console.log('[Withdraw] Fee recipient:', feeRecipient)
      console.log('[Withdraw] Relay fee BPS:', relayFeeBPS.toString())

      let hash: `0x${string}`

      if (useRelayer && relayerQuote) {
        // Submit to relayer API for private withdrawal
        console.log('[Withdraw] Submitting to relayer...')
        setProofProgress('Submitting to relayer...')

        const relayerResponse = await fetch(`${API_BASE_URL}/api/v1/relayer/request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: 5000,
            scope: poolScope.toString(),
            withdrawal: {
              processooor: withdrawal.processooor,
              data: withdrawal.data,
            },
            proof: {
              pA: contractProof.pA.map((v) => v.toString()),
              pB: contractProof.pB.map((row) => row.map((v) => v.toString())),
              pC: contractProof.pC.map((v) => v.toString()),
              pubSignals: contractProof.pubSignals.map((v) => v.toString()),
            },
          }),
        })

        const result = await relayerResponse.json()

        if (!result.success) {
          throw new Error(result.error || 'Relayer request failed')
        }

        hash = result.txHash as `0x${string}`
        console.log('[Withdraw] Relayer tx hash:', hash)
      } else {
        // Direct contract call (not private - user's address visible)
        console.log('[Withdraw] Direct contract call...')

        hash = await walletClient.writeContract({
          address: contracts.entrypoint as Address,
          abi: entrypointAbi,
          functionName: 'relay',
          args: [withdrawal, contractProof, poolScope],
        })

        await publicClient.waitForTransactionReceipt({ hash })
      }

      return hash
    },
    [
      contracts,
      publicClient,
      walletClient,
      address,
      masterNullifier,
      masterSecret,
      poolScope,
      recipient,
      useRelayer,
      relayerQuote,
    ]
  )

  /**
   * Execute all withdrawals in sequence
   */
  const handleExecuteWithdrawals = useCallback(async () => {
    if (!contracts || !publicClient) {
      setError('Missing required data')
      return
    }

    setStep('executing')
    setError(null)
    setTxHashes([])
    setCurrentTxIndex(0)

    try {
      // Fetch all merkle leaves (deposits + withdrawal change commitments)
      // IMPORTANT: Must use merkle leaves, NOT deposits, to build correct state tree
      setProofProgress('Fetching pool state...')
      let allCommitments = await merkleLeavesApi.getCommitments(contracts.pool)

      if (allCommitments.length === 0) {
        throw new Error('No commitments found in pool')
      }

      console.log('[Withdraw] Fetched', allCommitments.length, 'merkle leaves from indexer')

      const hashes: `0x${string}`[] = []

      // Execute each withdrawal in sequence
      for (let i = 0; i < withdrawalPlan.length; i++) {
        setCurrentTxIndex(i)
        const plan = withdrawalPlan[i]

        setProofProgress(
          `Transaction ${i + 1}/${withdrawalPlan.length}: Generating proof for ${formatEther(plan.withdrawAmount)} MNT...`
        )

        // Use derivationDepth + 1 as childIndex for new secrets
        // This ensures newNullifier != existingNullifier (circuit requirement)
        // derivationDepth tracks how many times this commitment chain has been derived
        // (0 = original deposit, 1 = after first withdrawal, etc.)
        const nextChildIndex = plan.deposit.derivationDepth + 1n + BigInt(i)
        console.log(
          `[Withdraw] Using childIndex ${nextChildIndex} for deposit with derivationDepth ${plan.deposit.derivationDepth}`
        )
        const hash = await executeWithdrawal(plan, allCommitments, nextChildIndex)
        hashes.push(hash)
        setTxHashes([...hashes])

        // Brief pause between txs to let chain state update
        if (i < withdrawalPlan.length - 1) {
          setProofProgress('Waiting for confirmation...')
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Refetch merkle leaves for next tx (tree may have changed due to new commitment)
          allCommitments = await merkleLeavesApi.getCommitments(contracts.pool)
          console.log('[Withdraw] Refetched', allCommitments.length, 'merkle leaves')
        }
      }

      setStep('success')
      onSuccess?.(hashes[hashes.length - 1])

      // NOTE: Pool withdrawals are NOT recorded to backend - that's the privacy guarantee!
      // History is reconstructed client-side using user's keys in /history page

      // Force full sync after withdrawal to track any change commitments
      setTimeout(() => {
        forceSync().catch(console.error)
      }, 2000) // Wait for indexer to catch up
    } catch (err) {
      console.error('Withdrawal error:', err)

      // Translate error to user-friendly message
      const rawMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      const translated = translateError(rawMessage)

      console.error('[Withdraw] Error:', rawMessage)
      console.error('[Withdraw] Translated:', translated)

      setError(`${translated.title}: ${translated.description}`)
      setStep('review') // Go back to review on error

      // If it's a sync-related error, trigger a preflight refresh
      if (translated.canRetry) {
        // Short delay then re-run preflight
        setTimeout(() => {
          runPreflightCheck()
        }, 2000)
      }
    } finally {
      setProofProgress('')
    }
  }, [
    contracts,
    publicClient,
    withdrawalPlan,
    executeWithdrawal,
    onSuccess,
    forceSync,
    runPreflightCheck,
  ])

  const handleContinue = useCallback(() => {
    setError(null)

    if (step === 'amount') {
      if (!isValidAmount) {
        setError('Please enter a valid amount')
        return
      }
      setStep('recipient')
    } else if (step === 'recipient') {
      if (!isValidRecipient) {
        setError('Please enter a valid recipient address')
        return
      }
      setStep('review')
    } else if (step === 'review') {
      handleExecuteWithdrawals()
    }
  }, [step, isValidAmount, isValidRecipient, handleExecuteWithdrawals])

  const handleSetMax = useCallback(() => {
    setWithdrawAmount(formatEther(totalBalance))
  }, [totalBalance])

  const isExecuting = step === 'executing'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent variant="glass" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Withdraw from Pool
          </DialogTitle>
          <DialogDescription>
            {step === 'amount' && 'Enter the total amount you want to withdraw.'}
            {step === 'recipient' && 'Enter the recipient address.'}
            {step === 'review' && 'Review your withdrawal plan.'}
            {step === 'executing' && 'Processing withdrawals...'}
            {step === 'success' && 'All withdrawals completed!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Amount Step */}
          {step === 'amount' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Withdraw Amount (MNT)</Label>
                <div className="relative">
                  <Input
                    id="withdrawAmount"
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="0.0"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="pr-16"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 h-7 -translate-y-1/2 text-xs"
                    onClick={handleSetMax}
                  >
                    MAX
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  Available: {formatEther(totalBalance)} MNT ({deposits.length} deposits)
                </p>
              </div>

              {isValidAmount && withdrawalPlan.length > 1 && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-sm">
                    <Sparkles className="mr-1 inline h-4 w-4" />
                    This will require {withdrawalPlan.length} transactions (one per deposit used).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Recipient Step */}
          {step === 'recipient' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  type="text"
                  placeholder="0x..."
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                />
                <p className="text-muted-foreground text-sm">
                  The address that will receive the withdrawn funds.
                </p>
              </div>

              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-sm">
                  <Shield className="mr-1 inline h-4 w-4" />
                  ZK proofs ensure no link between your deposits and this withdrawal.
                </p>
              </div>
            </div>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Sync Status Indicator */}
              <div
                className={`rounded-lg border p-3 ${
                  isLoadingPreflight
                    ? 'border-slate-500/20 bg-slate-500/5'
                    : preflight?.canProceed
                      ? 'border-emerald-500/20 bg-emerald-500/5'
                      : preflightError || !preflight?.canProceed
                        ? 'border-amber-500/20 bg-amber-500/5'
                        : 'border-slate-500/20 bg-slate-500/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isLoadingPreflight ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : preflight?.canProceed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-amber-500" />
                    )}
                    <span className="text-sm font-medium">
                      {isLoadingPreflight
                        ? 'Checking sync status...'
                        : preflight?.canProceed
                          ? 'Ready to withdraw'
                          : 'Waiting for sync'}
                    </span>
                  </div>
                  {!isLoadingPreflight && !preflight?.canProceed && (
                    <button
                      onClick={runPreflightCheck}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </button>
                  )}
                </div>

                {/* Sync check details */}
                {preflight && !isLoadingPreflight && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.indexerSynced ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">Indexer</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.aspSynced ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">ASP Tree</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.stateTreeValid ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">State Tree</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {preflight.checks.labelExists ? (
                        <CheckCircle className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <XCircle className="h-3 w-3 text-amber-500" />
                      )}
                      <span className="text-muted-foreground">Deposit</span>
                    </div>
                  </div>
                )}

                {/* Error/Warning messages */}
                {preflight && !preflight.canProceed && preflight.errors.length > 0 && (
                  <div className="mt-2 text-xs text-amber-400">
                    {preflight.errors[0]}
                    {retryCountdown !== null && retryCountdown > 0 && (
                      <span className="ml-1 text-slate-400">(retry in {retryCountdown}s)</span>
                    )}
                  </div>
                )}

                {preflightError && (
                  <div className="mt-2 text-xs text-red-400">{preflightError}</div>
                )}
              </div>

              {/* Privacy Mode Toggle */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock
                      className={`h-4 w-4 ${useRelayer ? 'text-emerald-500' : 'text-muted-foreground'}`}
                    />
                    <span className="text-sm font-medium">Private Withdrawal</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseRelayer(!useRelayer)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      useRelayer ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        useRelayer ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-muted-foreground mt-2 text-xs">
                  {useRelayer
                    ? 'Your address will NOT appear on-chain. The relayer broadcasts the transaction.'
                    : 'Your address WILL appear on-chain. You broadcast the transaction directly.'}
                </p>
                {useRelayer && relayerQuote && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Relayer Fee</span>
                    <span className="font-medium text-amber-500">
                      {(relayerQuote.feeBPS / 100).toFixed(2)}% (
                      {formatEther((parsedAmount * BigInt(relayerQuote.feeBPS)) / 10000n)} MNT)
                    </span>
                  </div>
                )}
                {useRelayer && isLoadingQuote && (
                  <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading fee quote...
                  </div>
                )}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-mono font-medium">{withdrawAmount} MNT</span>
                  </div>
                  {useRelayer && relayerQuote && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">After Fee</span>
                      <span className="font-mono font-medium text-emerald-500">
                        {formatEther(
                          parsedAmount - (parsedAmount * BigInt(relayerQuote.feeBPS)) / 10000n
                        )}{' '}
                        MNT
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-mono text-xs">
                      {recipient.slice(0, 10)}...{recipient.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transactions</span>
                    <span className="font-medium">{totalTxCount}</span>
                  </div>
                </div>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs font-medium uppercase">
                  Withdrawal Breakdown
                </p>
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {withdrawalPlan.map((plan, i) => (
                    <div
                      key={plan.deposit.txHash}
                      className="bg-muted/50 flex items-center justify-between rounded p-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        TX {i + 1} {plan.isPartial && '(partial)'}
                      </span>
                      <span className="font-mono">{formatEther(plan.withdrawAmount)} MNT</span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className={`rounded-lg border p-4 text-center ${
                  useRelayer
                    ? 'border-emerald-500/20 bg-emerald-500/5'
                    : 'bg-primary/5 border-primary/20'
                }`}
              >
                {useRelayer ? (
                  <Lock className="mx-auto h-8 w-8 text-emerald-500" />
                ) : (
                  <Shield className="text-primary mx-auto h-8 w-8" />
                )}
                <p className="mt-2 font-medium">
                  {useRelayer ? 'Private Withdrawal Ready' : 'Ready to Generate Proofs'}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {useRelayer
                    ? 'The relayer will broadcast your transaction privately. Your address stays hidden.'
                    : 'Each transaction requires a ZK proof. This may take 10-30 seconds per transaction.'}
                </p>
              </div>
            </div>
          )}

          {/* Executing Step */}
          {step === 'executing' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center py-4">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground mt-4 text-center text-sm">{proofProgress}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                {withdrawalPlan.map((plan, i) => (
                  <div
                    key={plan.deposit.txHash}
                    className={`flex items-center justify-between rounded p-2 text-sm ${
                      i < currentTxIndex
                        ? 'bg-primary/10'
                        : i === currentTxIndex
                          ? 'bg-muted animate-pulse'
                          : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {i < txHashes.length ? (
                        <Check className="text-primary h-4 w-4" />
                      ) : i === currentTxIndex ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <div className="bg-muted-foreground/30 h-4 w-4 rounded-full" />
                      )}
                      <span>TX {i + 1}</span>
                    </div>
                    <span className="font-mono">{formatEther(plan.withdrawAmount)} MNT</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                <Check className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium">Withdrawals Complete!</p>
              <p className="text-muted-foreground mt-2 text-center text-sm">
                {withdrawAmount} MNT has been sent to the recipient in {txHashes.length} transaction
                {txHashes.length > 1 ? 's' : ''}.
              </p>
              {txHashes.length > 0 && (
                <div className="mt-4 space-y-1">
                  {txHashes.map((hash, i) => (
                    <a
                      key={hash}
                      href={`https://mantlescan.xyz/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary block text-sm hover:underline"
                    >
                      View TX {i + 1}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-destructive/10 text-destructive flex items-start gap-2 rounded-lg p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 'success' ? (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          ) : step === 'amount' && deposits.length === 0 ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'amount') handleOpenChange(false)
                  else if (step === 'recipient') setStep('amount')
                  else if (step === 'review') setStep('recipient')
                }}
                disabled={isExecuting}
              >
                {step === 'amount' ? 'Cancel' : 'Back'}
              </Button>
              <Button
                onClick={handleContinue}
                disabled={
                  (step === 'amount' && !isValidAmount) ||
                  (step === 'recipient' && !isValidRecipient) ||
                  (step === 'review' && (isLoadingPreflight || !preflight?.canProceed)) ||
                  isExecuting
                }
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : step === 'review' && isLoadingPreflight ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : step === 'review' && !preflight?.canProceed ? (
                  'Waiting for Sync...'
                ) : step === 'review' ? (
                  `Withdraw (${totalTxCount} TX${totalTxCount > 1 ? 's' : ''})`
                ) : (
                  'Continue'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
