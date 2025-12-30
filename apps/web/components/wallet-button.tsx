'use client'

/**
 * Wallet connection button component.
 *
 * Uses Reown AppKit for wallet connection with a custom styled button.
 * Shows real balance using wagmi's useBalance hook (not AppKit's balance service).
 */

import { useAppKit, useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { useAccount, useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Formats an Ethereum address for display.
 * Shows first 6 and last 4 characters.
 */
function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

/**
 * Formats a balance for display.
 */
function formatBalance(value: bigint | undefined, decimals: number = 18): string {
  if (!value) return '0'
  const formatted = formatUnits(value, decimals)
  const num = parseFloat(formatted)
  if (num === 0) return '0'
  if (num < 0.001) return '<0.001'
  if (num < 1) return num.toFixed(3)
  if (num < 100) return num.toFixed(2)
  return num.toFixed(1)
}

interface WalletButtonProps {
  className?: string
}

/**
 * Wallet connection button.
 *
 * Shows "Connect Wallet" when disconnected, or the connected address
 * with balance and network when connected.
 */
export function WalletButton({ className = '' }: WalletButtonProps) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()
  const { disconnect: _disconnect } = useDisconnect()
  const { chain } = useAccount()

  // Fetch real balance from RPC (not AppKit's balance service)
  const { data: balance } = useBalance({
    address: address as `0x${string}` | undefined,
  })

  if (isConnected && address) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {/* Balance display */}
        <div className="bg-secondary text-foreground rounded-lg px-3 py-2 text-sm font-medium">
          {formatBalance(balance?.value, balance?.decimals)} {balance?.symbol ?? 'MNT'}
        </div>

        {/* Network indicator */}
        <button
          onClick={() => open({ view: 'Networks' })}
          className="bg-secondary text-muted-foreground hover:bg-secondary/80 flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        >
          <span className="bg-primary h-2 w-2 rounded-full" />
          {chain?.name ?? 'Unknown'}
        </button>

        {/* Address button */}
        <button
          onClick={() => open()}
          className="bg-secondary text-foreground hover:bg-secondary/80 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <span>{formatAddress(address)}</span>
        </button>
      </div>
    )
  }

  return (
    <Button onClick={() => open()} className={className}>
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  )
}

/**
 * Standalone connect button for landing/onboarding pages.
 * Larger size with more prominent styling.
 */
export function ConnectButton({ className = '' }: WalletButtonProps) {
  const { open } = useAppKit()
  const { isConnected } = useAppKitAccount()

  if (isConnected) {
    return null
  }

  return (
    <Button
      onClick={() => open()}
      size="lg"
      className={cn('shadow-primary/25 hover:shadow-primary/40 shadow-lg', className)}
    >
      <Wallet className="h-5 w-5" />
      Connect Wallet
    </Button>
  )
}
