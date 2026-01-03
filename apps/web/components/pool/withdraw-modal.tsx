'use client'

/**
 * Withdraw Modal for Privacy Pool
 *
 * Allows users to withdraw MNT from the privacy pool with ZK proof.
 * Flow: Select deposit -> Enter amount -> Enter recipient -> Generate proof -> Withdraw
 *
 * Note: ZK proof generation requires circuit artifacts (WASM + zkey) to be loaded.
 * This is a placeholder UI showing the intended flow.
 */

import { useState, useCallback } from 'react'
import { parseEther, formatEther, isAddress } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { Loader2, Shield, AlertCircle, Check, ArrowUpRight, Lock, Sparkles } from 'lucide-react'
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

interface WithdrawModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (txHash: `0x${string}`) => void
}

type Step = 'select' | 'amount' | 'recipient' | 'proof' | 'pending' | 'success'

export function WithdrawModal({ open, onOpenChange, onSuccess: _onSuccess }: WithdrawModalProps) {
  const { address: _address } = useAccount()
  const _publicClient = usePublicClient()
  const { data: _walletClient } = useWalletClient()
  const { deposits, totalBalance: _totalBalance, contracts: _contracts } = usePoolContext()

  const [step, setStep] = useState<Step>('select')
  const [selectedDeposit, setSelectedDeposit] = useState<PoolDeposit | null>(null)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [recipient, setRecipient] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [_isGeneratingProof, _setIsGeneratingProof] = useState(false)
  const [_isWithdrawing, _setIsWithdrawing] = useState(false)

  const parsedAmount = withdrawAmount ? parseEther(withdrawAmount) : BigInt(0)
  const maxWithdrawable = selectedDeposit?.value ?? BigInt(0)
  const isValidAmount = parsedAmount > BigInt(0) && parsedAmount <= maxWithdrawable
  const isValidRecipient = isAddress(recipient)

  const resetModal = useCallback(() => {
    setStep('select')
    setSelectedDeposit(null)
    setWithdrawAmount('')
    setRecipient('')
    setError(null)
    setTxHash(null)
  }, [])

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        resetModal()
      }
      onOpenChange(open)
    },
    [onOpenChange, resetModal]
  )

  const handleSelectDeposit = useCallback((deposit: PoolDeposit) => {
    setSelectedDeposit(deposit)
    setWithdrawAmount(formatEther(deposit.value))
    setStep('amount')
  }, [])

  const handleContinue = useCallback(async () => {
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
      setStep('proof')
    } else if (step === 'proof') {
      // TODO: Implement actual ZK proof generation
      // This requires:
      // 1. Loading circuit WASM and zkey files
      // 2. Building the Merkle tree from pool state
      // 3. Generating witness with snarkjs
      // 4. Creating the proof
      setError(
        'ZK proof generation is not yet implemented. Circuit artifacts need to be built and loaded.'
      )
    }
  }, [step, isValidAmount, isValidRecipient])

  const handleSetMax = useCallback(() => {
    if (selectedDeposit) {
      setWithdrawAmount(formatEther(selectedDeposit.value))
    }
  }, [selectedDeposit])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Withdraw from Pool
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a deposit to withdraw from.'}
            {step === 'amount' && 'Enter the amount you want to withdraw.'}
            {step === 'recipient' && 'Enter the recipient address.'}
            {step === 'proof' && 'Generate a zero-knowledge proof.'}
            {step === 'pending' && 'Processing your withdrawal...'}
            {step === 'success' && 'Withdrawal successful!'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Deposit Step */}
          {step === 'select' && (
            <div className="space-y-2">
              {deposits.length === 0 ? (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <Lock className="text-muted-foreground mx-auto h-8 w-8" />
                  <p className="text-muted-foreground mt-2 text-sm">
                    You have no deposits to withdraw from.
                  </p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {deposits.map((deposit) => (
                    <button
                      key={deposit.txHash}
                      onClick={() => handleSelectDeposit(deposit)}
                      className="bg-muted hover:bg-muted/80 w-full rounded-lg p-4 text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-lg font-medium">
                            {formatEther(deposit.value)} MNT
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Index #{deposit.index.toString()}
                          </p>
                        </div>
                        <ArrowUpRight className="text-muted-foreground h-5 w-5" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Amount Step */}
          {step === 'amount' && selectedDeposit && (
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
                  Available: {formatEther(selectedDeposit.value)} MNT
                </p>
              </div>

              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-sm">
                  <Sparkles className="mr-1 inline h-4 w-4" />
                  Partial withdrawals leave the remainder in the pool with a new commitment.
                </p>
              </div>
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
                  The ZK proof ensures no link between your deposit and this withdrawal.
                </p>
              </div>
            </div>
          )}

          {/* Proof Generation Step */}
          {step === 'proof' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono">{withdrawAmount} MNT</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recipient</span>
                    <span className="font-mono text-xs">
                      {recipient.slice(0, 10)}...{recipient.slice(-8)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border-primary/20 rounded-lg border p-4 text-center">
                <Shield className="text-primary mx-auto h-8 w-8" />
                <p className="mt-2 font-medium">Zero-Knowledge Proof</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Click generate to create a ZK proof. This proves you own a deposit without
                  revealing which one.
                </p>
              </div>

              {_isGeneratingProof && (
                <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating proof... (this may take 10-30 seconds)
                </div>
              )}
            </div>
          )}

          {/* Pending Step */}
          {step === 'pending' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
              <p className="text-muted-foreground mt-4">Submitting withdrawal transaction...</p>
            </div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
                <Check className="h-6 w-6" />
              </div>
              <p className="mt-4 font-medium">Withdrawal Successful!</p>
              <p className="text-muted-foreground mt-2 text-center text-sm">
                {withdrawAmount} MNT has been sent to the recipient.
              </p>
              {txHash && (
                <a
                  href={`https://sepolia.mantlescan.xyz/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-2 text-sm hover:underline"
                >
                  View transaction
                </a>
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
          ) : step === 'select' ? (
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (step === 'amount') setStep('select')
                  else if (step === 'recipient') setStep('amount')
                  else if (step === 'proof') setStep('recipient')
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={
                  (step === 'amount' && !isValidAmount) ||
                  (step === 'recipient' && !isValidRecipient) ||
                  _isGeneratingProof ||
                  _isWithdrawing
                }
              >
                {_isGeneratingProof ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : _isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Withdrawing...
                  </>
                ) : step === 'proof' ? (
                  'Generate Proof'
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
