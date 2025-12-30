'use client'

/**
 * Public receipt verification page.
 *
 * Allows anyone to verify a payment by checking:
 * - Receipt hash matches on-chain anchor
 * - Transaction confirmed on Mantle
 * - Amount and timestamp match
 */

import { useState } from 'react'
import { Search, CheckCircle2, XCircle, ExternalLink, Loader2 } from 'lucide-react'
import { AppShell } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getTxExplorerUrl } from '@/lib/chains'

interface VerificationResult {
  verified: boolean
  receiptHash: string
  amount: string
  token: string
  timestamp: Date
  txHash: string
  blockNumber: number
}

export default function VerifyPage() {
  const [receiptId, setReceiptId] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!receiptId.trim()) return

    setIsVerifying(true)
    setError(null)
    setResult(null)

    try {
      // TODO: Implement verification
      // 1. Fetch receipt from backend by ID
      // 2. Compute expected receiptHash
      // 3. Query on-chain ReceiptAnchored event
      // 4. Compare values

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Feature not yet implemented
      setError('Verification is coming soon! This feature is under development.')
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <AppShell showNav={false} maxWidth="lg" className="items-center justify-center">
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center">
            <Search className="text-muted-foreground mx-auto h-12 w-12" />
            <h1 className="text-foreground mt-4 text-3xl font-bold">
              Verify Payment
              <Badge variant="secondary" className="ml-2">
                Coming Soon
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-2">
              Enter a receipt ID to verify the payment on-chain
            </p>
          </div>

          {/* Verification form */}
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div>
                <label className="text-foreground block text-sm font-medium">Receipt ID</label>
                <Input
                  type="text"
                  value={receiptId}
                  onChange={(e) => setReceiptId(e.target.value)}
                  placeholder="Enter receipt ID or hash"
                  className="mt-1"
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={!receiptId.trim() || isVerifying}
                size="lg"
                className="mt-4 w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Receipt'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Error display */}
          {error && (
            <div className="border-destructive/50 bg-destructive/10 mt-6 rounded-lg border p-4">
              <p className="text-destructive">{error}</p>
            </div>
          )}

          {/* Result display */}
          {result && (
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      result.verified ? 'bg-primary/20' : 'bg-destructive/20'
                    }`}
                  >
                    {result.verified ? (
                      <CheckCircle2 className="text-primary h-5 w-5" />
                    ) : (
                      <XCircle className="text-destructive h-5 w-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-foreground text-lg font-semibold">
                      {result.verified ? 'Payment Verified' : 'Verification Failed'}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                      {result.verified
                        ? 'This payment is confirmed on Mantle'
                        : 'Could not verify this payment'}
                    </p>
                  </div>
                </div>

                {result.verified && (
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="text-foreground font-medium">
                        {result.amount} {result.token}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Timestamp</span>
                      <span className="text-foreground font-medium">
                        {result.timestamp.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Block</span>
                      <span className="text-foreground font-medium">#{result.blockNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Transaction</span>
                      <a
                        href={getTxExplorerUrl(result.txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80 inline-flex items-center gap-1 font-mono"
                      >
                        {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <p className="text-muted-foreground mt-6 text-center text-sm">
            Receipts are anchored on-chain and can be independently verified by anyone.
          </p>
        </div>
      </div>
    </AppShell>
  )
}
