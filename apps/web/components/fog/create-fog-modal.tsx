'use client'

/**
 * Modal for creating a new fog wallet.
 *
 * Shows name input, creates wallet, and displays funding address with QR.
 */

import { useState, useCallback } from 'react'
import { Loader2, Copy, Check, Wallet } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useCreateFogWallet } from '@/hooks/use-fog-wallet'
import type { FogWallet } from '@/types/fog'

// ============================================================
// Types
// ============================================================

interface CreateFogModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (wallet: FogWallet) => void
}

// ============================================================
// Component
// ============================================================

export function CreateFogModal({ open, onOpenChange, onCreated }: CreateFogModalProps) {
  const { createFogWallet, isPending, error, reset } = useCreateFogWallet()
  const [name, setName] = useState('')
  const [createdWallet, setCreatedWallet] = useState<FogWallet | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = useCallback(async () => {
    try {
      const wallet = await createFogWallet(name || undefined)
      setCreatedWallet(wallet)
      onCreated?.(wallet)
    } catch {
      // Error is handled by the hook
    }
  }, [createFogWallet, name, onCreated])

  const copyAddress = useCallback(() => {
    if (!createdWallet) return
    navigator.clipboard.writeText(createdWallet.stealthAddress)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [createdWallet])

  const handleClose = useCallback(() => {
    setName('')
    setCreatedWallet(null)
    setCopied(false)
    reset()
    onOpenChange(false)
  }, [onOpenChange, reset])

  // Show success state
  if (createdWallet) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Fog Wallet Created
            </DialogTitle>
            <DialogDescription>
              Send funds to this address to fund your fog wallet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Wallet name */}
            <div className="text-center">
              <p className="text-foreground text-lg font-semibold">{createdWallet.name}</p>
            </div>

            {/* Funding address */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-muted-foreground mb-2 text-xs">Funding Address</p>
                <p className="text-foreground break-all font-mono text-sm">
                  {createdWallet.stealthAddress}
                </p>
              </CardContent>
            </Card>

            {/* Copy button */}
            <Button className="w-full" onClick={copyAddress}>
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Funding Address
                </>
              )}
            </Button>

            {/* Info */}
            <p className="text-muted-foreground text-center text-xs">
              Fund from any wallet or exchange for privacy. The longer you wait before spending, the
              better the privacy.
            </p>

            {/* Done button */}
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Show create form
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Fog Wallet
          </DialogTitle>
          <DialogDescription>
            Create a new fog wallet for private payments. Fund it from any source, then pay from it
            later for sender privacy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name input */}
          <div>
            <label className="text-foreground block text-sm font-medium">
              Wallet Name (optional)
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Coffee Fund, Travel"
              className="mt-1"
              disabled={isPending}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Leave blank for auto-generated name
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">{error}</div>
          )}

          {/* Create button */}
          <Button className="w-full" onClick={handleCreate} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Create Fog Wallet
              </>
            )}
          </Button>

          {/* Info */}
          <div className="text-muted-foreground space-y-2 text-xs">
            <p>
              <strong>How it works:</strong>
            </p>
            <ol className="list-inside list-decimal space-y-1">
              <li>Create a fog wallet (unique stealth address)</li>
              <li>Fund it from any source (wallet, exchange, friend)</li>
              <li>Wait for better privacy (6+ hours recommended)</li>
              <li>Pay from the fog wallet - your identity stays hidden</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
