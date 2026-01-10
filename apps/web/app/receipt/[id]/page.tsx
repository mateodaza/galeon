'use client'

/**
 * Public Receipt Verification Page
 *
 * Allows anyone to verify a payment receipt by its ID.
 * No authentication required - receipts are public and verifiable.
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  CheckCircle,
  ExternalLink,
  Copy,
  Clock,
  AlertCircle,
  Shield,
  Share2,
  HelpCircle,
  X,
} from 'lucide-react'
import * as m from 'motion/react-m'
import { useReducedMotion } from 'motion/react'
import { Button } from '@/components/ui/button'
import { API_BASE_URL } from '@/lib/api'

type PaymentType = 'regular' | 'stealth_pay' | 'private_send'

interface PublicReceipt {
  id: string
  receiptHash: string
  portName: string
  stealthAddress: string
  amount: string
  currency: string
  tokenAddress: string | null
  paymentType: PaymentType
  payerAddress: string | null // null for stealth_pay/private_send
  status: 'confirmed' | 'collected'
  blockNumber: string
  txHash: string
  chainId: number
  createdAt: string
  verified: boolean
  verifiedAt: string
}

type LoadingState = 'loading' | 'success' | 'error'

export default function PublicReceiptPage() {
  const params = useParams()
  const id = params.id as string
  const [receipt, setReceipt] = useState<PublicReceipt | null>(null)
  const [state, setState] = useState<LoadingState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const prefersReducedMotion = useReducedMotion()
  const fadeInUp = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 },
      }

  useEffect(() => {
    async function fetchReceipt() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/receipts/public/${id}`)
        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Receipt not found')
        }
        const data: PublicReceipt = await response.json()
        setReceipt(data)
        setState('success')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load receipt')
        setState('error')
      }
    }

    if (id) {
      fetchReceipt()
    }
  }, [id])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const shareReceipt = () => {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({
        title: 'Galeon Payment Receipt',
        text: `View my verified payment receipt`,
        url,
      })
    } else {
      copyToClipboard(url, 'link')
    }
  }

  const getExplorerUrl = (txHash: string, chainId: number) => {
    if (chainId === 5000) {
      return `https://explorer.mantle.xyz/tx/${txHash}`
    }
    if (chainId === 5003) {
      return `https://sepolia.mantlescan.xyz/tx/${txHash}`
    }
    return `https://etherscan.io/tx/${txHash}`
  }

  const formatAmount = (amount: string, currency: string) => {
    const decimals = currency === 'USDC' || currency === 'USDT' ? 6 : 18
    const value = Number(BigInt(amount)) / 10 ** decimals
    return value.toLocaleString('en-US', { maximumFractionDigits: 6 })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const shortenAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  const getChainName = (chainId: number) => {
    if (chainId === 5000) return 'Mantle'
    if (chainId === 5003) return 'Mantle Sepolia'
    return `Chain ${chainId}`
  }

  const getPaymentTypeLabel = (type: PaymentType) => {
    switch (type) {
      case 'stealth_pay':
        return 'Stealth Pay'
      case 'private_send':
        return 'Private Send'
      default:
        return 'Direct Payment'
    }
  }

  const getPaymentTypeDescription = (type: PaymentType) => {
    switch (type) {
      case 'stealth_pay':
        return 'Sender identity is obfuscated'
      case 'private_send':
        return 'Full ZK privacy from pool'
      default:
        return 'Sender visible on-chain'
    }
  }

  if (state === 'loading') {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <SeaBackground />
        <div className="relative z-10 text-center">
          <div className="relative mx-auto mb-4 h-12 w-12">
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-cyan-400/30" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <Shield className="absolute inset-2 h-8 w-8 text-cyan-400" />
          </div>
          <p className="text-slate-300">Verifying payment...</p>
        </div>
      </div>
    )
  }

  if (state === 'error' || !receipt) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
        <SeaBackground />
        <m.div {...fadeInUp} className="relative z-10 w-full max-w-md">
          <div className="rounded-2xl border border-red-500/20 bg-slate-900/60 p-8 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h1 className="mb-2 text-xl font-bold text-white">Receipt Not Found</h1>
            <p className="mb-6 text-sm text-slate-300">
              {error || 'This receipt does not exist or has not been confirmed yet.'}
            </p>
            <Link href="/">
              <Button
                variant="outline"
                className="gap-2 border-slate-600 bg-slate-800/50 text-white hover:bg-slate-700/50"
              >
                <Image
                  src="/galeon-logo.png"
                  alt="Galeon"
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
                Go to Galeon
              </Button>
            </Link>
          </div>
        </m.div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-8">
      <SeaBackground />

      <div className="relative z-10 mx-auto max-w-lg">
        {/* Header */}
        <m.div {...fadeInUp} className="mb-6 text-center">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image src="/galeon-logo.png" alt="Galeon" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-bold text-white">Galeon</span>
          </Link>
        </m.div>

        {/* Main Receipt Card - Glassmorphic */}
        <m.div {...fadeInUp}>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/40 shadow-2xl backdrop-blur-xl">
            {/* Verification Banner */}
            <div className="flex items-center justify-center gap-2 bg-emerald-500/20 px-4 py-3 backdrop-blur-sm">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <span className="font-semibold text-emerald-400">Verified Payment</span>
            </div>

            <div className="p-6">
              {/* Amount Display */}
              <div className="mb-6 text-center">
                <p className="mb-1 text-xs uppercase tracking-wider text-slate-400">
                  Amount Received
                </p>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-4xl font-bold tracking-tight text-white">
                    {formatAmount(receipt.amount, receipt.currency)}
                  </span>
                  <span className="text-xl font-medium text-cyan-400">{receipt.currency}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  to <span className="font-medium text-white">{receipt.portName}</span>
                </p>
              </div>

              {/* Status Badge */}
              <div className="mb-6 flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium backdrop-blur-sm ${
                    receipt.status === 'collected'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {receipt.status === 'collected' ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Clock className="h-4 w-4" />
                  )}
                  {receipt.status === 'collected' ? 'Collected' : 'Confirmed'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-0 rounded-xl border border-white/5 bg-slate-950/30 backdrop-blur-sm">
                <DetailRow
                  label="Payment Type"
                  value={getPaymentTypeLabel(receipt.paymentType)}
                  subValue={getPaymentTypeDescription(receipt.paymentType)}
                />
                {receipt.payerAddress ? (
                  <DetailRow
                    label="Sender"
                    value={shortenAddress(receipt.payerAddress)}
                    fullValue={receipt.payerAddress}
                    onCopy={() => copyToClipboard(receipt.payerAddress!, 'sender')}
                  />
                ) : (
                  <DetailRow label="Sender" value="Private" isPrivate />
                )}
                <DetailRow label="Date" value={formatDate(receipt.createdAt)} />
                <DetailRow label="Chain" value={getChainName(receipt.chainId)} />
                <DetailRow
                  label="Stealth Address"
                  value={shortenAddress(receipt.stealthAddress)}
                  fullValue={receipt.stealthAddress}
                  onCopy={() => copyToClipboard(receipt.stealthAddress, 'address')}
                />
                <DetailRow
                  label="Transaction"
                  value={shortenAddress(receipt.txHash)}
                  fullValue={receipt.txHash}
                  href={getExplorerUrl(receipt.txHash, receipt.chainId)}
                />
                <DetailRow label="Block" value={`#${receipt.blockNumber}`} isLast />
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10"
                  onClick={shareReceipt}
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2 border-cyan-500/30 bg-cyan-500/10 text-cyan-400 backdrop-blur-sm hover:bg-cyan-500/20"
                  onClick={() => setShowVerifyModal(true)}
                >
                  <HelpCircle className="h-4 w-4" />
                  How to Verify
                </Button>
              </div>
            </div>
          </div>
        </m.div>

        {/* Privacy Info */}
        <m.div {...fadeInUp} className="mt-4">
          <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-slate-900/30 p-4 backdrop-blur-xl">
            <Shield className="h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <p className="text-sm font-medium text-white">Privacy Protected</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                This payment used EIP-5564 stealth addresses. The receiver&apos;s identity remains
                private through a unique one-time address, while the payment is publicly verifiable
                on the blockchain.
              </p>
            </div>
          </div>
        </m.div>

        {/* Footer */}
        <m.div {...fadeInUp} className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Powered by{' '}
            <Link href="/" className="text-cyan-400 hover:underline">
              Galeon
            </Link>{' '}
            - Private Payments on Mantle
          </p>
        </m.div>

        {/* Copy notification */}
        {copied && (
          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
          >
            Copied {copied}!
          </m.div>
        )}

        {/* Verification Modal */}
        {showVerifyModal && receipt && (
          <VerificationModal
            receipt={receipt}
            onClose={() => setShowVerifyModal(false)}
            getExplorerUrl={getExplorerUrl}
          />
        )}
      </div>
    </div>
  )
}

/**
 * Animated sea background with waves
 * Uses wider SVG (200% width) to prevent edge clipping during animation
 */
function SeaBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-cyan-950" />

      {/* Animated wave layers - 200% width to prevent edge clipping */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: '40%' }}>
        <svg
          className="animate-wave-slow absolute bottom-0"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          style={{ width: '200%', height: '100%', left: '-50%' }}
        >
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.1)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.02)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave1)"
            d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,138.7C672,128,768,160,864,181.3C960,203,1056,213,1152,197.3C1248,181,1344,139,1440,117.3C1536,96,1632,128,1728,149.3C1824,171,1920,181,2016,176C2112,171,2208,149,2304,149.3C2400,149,2496,171,2592,181.3C2688,192,2784,192,2832,192L2880,192L2880,320L0,320Z"
          />
        </svg>

        <svg
          className="animate-wave-medium absolute bottom-0"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          style={{ width: '200%', height: '100%', left: '-50%' }}
        >
          <defs>
            <linearGradient id="wave2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.08)" />
              <stop offset="100%" stopColor="rgba(6, 182, 212, 0.01)" />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave2)"
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,213.3C672,224,768,224,864,208C960,192,1056,160,1152,154.7C1248,149,1344,171,1440,181.3C1536,192,1632,181,1728,170.7C1824,160,1920,149,2016,160C2112,171,2208,203,2304,208C2400,213,2496,192,2592,181.3C2688,171,2784,171,2832,171L2880,171L2880,320L0,320Z"
          />
        </svg>

        <svg
          className="animate-wave-fast absolute bottom-0"
          viewBox="0 0 2880 320"
          preserveAspectRatio="none"
          style={{ width: '200%', height: '100%', left: '-50%' }}
        >
          <defs>
            <linearGradient id="wave3" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            fill="url(#wave3)"
            d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,234.7C672,224,768,224,864,234.7C960,245,1056,267,1152,261.3C1248,256,1344,224,1440,208C1536,192,1632,203,1728,218.7C1824,235,1920,256,2016,261.3C2112,267,2208,256,2304,240C2400,224,2496,203,2592,197.3C2688,192,2784,203,2832,208L2880,213L2880,320L0,320Z"
          />
        </svg>
      </div>

      {/* Floating particles/bubbles */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="animate-float absolute rounded-full bg-cyan-400/10"
            style={{
              width: `${4 + i * 2}px`,
              height: `${4 + i * 2}px`,
              left: `${15 + i * 15}%`,
              bottom: `${10 + i * 5}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${4 + i}s`,
            }}
          />
        ))}
      </div>

      {/* Subtle glow */}
      <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 translate-y-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
    </div>
  )
}

interface DetailRowProps {
  label: string
  value: string
  fullValue?: string
  subValue?: string
  href?: string
  onCopy?: () => void
  isLast?: boolean
  isPrivate?: boolean
}

function DetailRow({
  label,
  value,
  fullValue,
  subValue,
  href,
  onCopy,
  isLast,
  isPrivate,
}: DetailRowProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 ${!isLast ? 'border-b border-white/5' : ''}`}
    >
      <span className="text-sm text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 font-mono text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            title={fullValue}
          >
            {value}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : isPrivate ? (
          <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-400">
            <Shield className="h-3.5 w-3.5" />
            {value}
          </span>
        ) : subValue ? (
          <div className="text-right">
            <span className="text-sm font-medium text-white">{value}</span>
            <span className="block text-xs text-slate-500">{subValue}</span>
          </div>
        ) : (
          <span className="font-mono text-sm text-white" title={fullValue}>
            {value}
          </span>
        )}
        {onCopy && (
          <button
            onClick={onCopy}
            className="rounded p-1 text-slate-500 transition-colors hover:text-cyan-400"
            title="Copy to clipboard"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

interface VerificationModalProps {
  receipt: PublicReceipt
  onClose: () => void
  getExplorerUrl: (txHash: string, chainId: number) => string
}

function VerificationModal({ receipt, onClose, getExplorerUrl }: VerificationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <m.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">How to Verify This Payment</h2>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <p>
            This receipt is cryptographically linked to an on-chain transaction. You can
            independently verify it:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                1
              </span>
              <div>
                <p className="font-medium text-white">Check the Transaction</p>
                <p className="text-slate-400">
                  View the transaction on the block explorer to confirm it exists and shows the
                  correct amount.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                2
              </span>
              <div>
                <p className="font-medium text-white">Verify the Stealth Address</p>
                <p className="text-slate-400">
                  The funds were sent to a stealth address derived using EIP-5564, which can only be
                  spent by the recipient.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">
                3
              </span>
              <div>
                <p className="font-medium text-white">Confirm Block Finality</p>
                <p className="text-slate-400">
                  Block #{receipt.blockNumber} has been finalized on{' '}
                  {receipt.chainId === 5000 ? 'Mantle' : 'Mantle Sepolia'}, making this transaction
                  irreversible.
                </p>
              </div>
            </div>
          </div>

          <a
            href={getExplorerUrl(receipt.txHash, receipt.chainId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 py-3 font-medium text-white transition-colors hover:bg-cyan-600"
          >
            <ExternalLink className="h-4 w-4" />
            View on Block Explorer
          </a>
        </div>
      </m.div>
    </div>
  )
}
