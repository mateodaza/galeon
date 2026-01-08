'use client'

/**
 * Receive page - manage payment links (Ports).
 *
 * Lists all Ports and allows creating new ones.
 * Each Port has its own stealth meta-address for payment isolation.
 * Includes collect functionality for claiming received funds.
 */

import { useState, useEffect } from 'react'
import { Ship, Plus, Loader2, Download } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AppShell, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PortCard } from '@/components/port-card'
import { usePorts, useCreatePort } from '@/hooks/use-ports'

export default function ReceivePage() {
  const router = useRouter()
  const { ports, isLoading, error, refetch } = usePorts()
  const [showCreateModal, setShowCreateModal] = useState(false)

  const actions = (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push('/collect')}>
        <Download className="h-4 w-4" />
        Collect Funds
      </Button>
      <Button onClick={() => setShowCreateModal(true)}>
        <Plus className="h-4 w-4" />
        New Payment Link
      </Button>
    </div>
  )

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader
        title="Receive"
        description="Create payment links and collect funds"
        actions={actions}
      />

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">Error loading payment links: {error.message}</p>
            <Button variant="link" onClick={() => refetch()} className="text-destructive mt-2">
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Ports list */}
      {!isLoading && !error && ports.length === 0 ? (
        <Card className="py-16">
          <CardContent className="flex flex-col items-center justify-center">
            <Ship className="text-muted-foreground/50 h-16 w-16" />
            <h2 className="text-foreground mt-4 text-xl font-semibold">No payment links yet</h2>
            <p className="text-muted-foreground mt-2">
              Create your first payment link to start receiving private payments
            </p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-6">
              Create Your First Payment Link
            </Button>
          </CardContent>
        </Card>
      ) : !isLoading && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ports.map((port) => (
            <PortCard key={port.id} port={port} />
          ))}
        </div>
      ) : null}

      {/* Create Port Modal */}
      <CreatePortModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={() => {
          refetch()
          setShowCreateModal(false)
        }}
      />
    </AppShell>
  )
}

function CreatePortModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [name, setName] = useState('')
  const { createPort, isPending, isConfirming, isSuccess, error, reset } = useCreatePort()

  const handleCreate = async () => {
    if (!name.trim()) return

    try {
      await createPort(name.trim())
    } catch {
      // Error handled by hook
    }
  }

  // Close modal on success
  useEffect(() => {
    if (isSuccess) {
      onSuccess()
      setName('')
    }
  }, [isSuccess, onSuccess])

  const handleClose = () => {
    reset()
    setName('')
    onOpenChange(false)
  }

  const isLoading = isPending || isConfirming

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent variant="glass">
        <DialogHeader>
          <DialogTitle>Create Payment Link</DialogTitle>
          <DialogDescription>
            Each payment link has its own stealth address for isolation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-foreground block text-sm font-medium">Name</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Main Business, Q1 Invoices"
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          {error && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              {error.message || 'Failed to create payment link'}
            </div>
          )}

          {isConfirming && (
            <div className="bg-primary/10 text-primary rounded-lg p-3 text-sm">
              Waiting for confirmation...
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || isLoading}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirm in wallet...
              </>
            ) : isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirming...
              </>
            ) : (
              'Create'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
