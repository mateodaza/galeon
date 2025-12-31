'use client'

/**
 * Send page - send funds privately.
 *
 * Supports sending to:
 * - Stealth meta-addresses (EIP-5564)
 * - Regular Ethereum addresses (with optional stealth wrapping)
 */

import { useState } from 'react'
import { Send } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function SendPage() {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')

  return (
    <AppShell requireAuth requireKeys>
      <PageHeader title="Send" description="Send funds privately to any address" />

      <Card className="mx-auto max-w-lg">
        <CardContent className="space-y-6 pt-6">
          {/* Recipient */}
          <div>
            <label className="text-foreground block text-sm font-medium">Recipient</label>
            <Input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x... or st:mnt:..."
              className="mt-1 font-mono"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Enter a wallet address or stealth meta-address
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="text-foreground block text-sm font-medium">Amount</label>
            <div className="relative mt-1">
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="pr-16"
              />
              <span className="text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                MNT
              </span>
            </div>
          </div>

          {/* Send button */}
          <Button className="w-full" disabled={!recipient || !amount}>
            <Send className="h-4 w-4" />
            Send
          </Button>

          {/* Info */}
          <p className="text-muted-foreground text-center text-xs">
            Sending to a stealth meta-address creates a one-time address only the recipient can
            access.
          </p>
        </CardContent>
      </Card>
    </AppShell>
  )
}
