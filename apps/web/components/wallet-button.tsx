'use client'

/**
 * Wallet connection button component.
 *
 * Shows sign-in status and triggers SignInModal for authentication flow.
 * Displays connected address, balance, and auth status indicators.
 */

import { useState, useRef, useEffect } from 'react'
import { useAppKitAccount, useDisconnect } from '@reown/appkit/react'
import { useBalance } from 'wagmi'
import { formatUnits } from 'viem'
import { Wallet, Shield, Key, ChevronDown, LogOut, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSignIn } from '@/hooks/use-sign-in'
import { usePoolContext } from '@/contexts/pool-context'
import { SignInModal } from '@/components/sign-in-modal'

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
  /** Visual variant for different backgrounds */
  variant?: 'dark' | 'light'
}

const styles = {
  dark: {
    button: 'border-white/20 bg-slate-900/50 hover:bg-slate-800/60',
    connect: 'bg-cyan-600/80 hover:bg-cyan-500/80 text-white',
    balance: 'text-cyan-400',
    address: 'text-white',
    divider: 'bg-white/20',
    indicator: {
      complete: 'bg-cyan-500',
      partial: 'bg-amber-500',
      none: 'bg-white/20',
    },
  },
  light: {
    button: 'border-slate-200/50 bg-white/70 hover:bg-white/90',
    connect: 'bg-cyan-600 hover:bg-cyan-500 text-white',
    balance: 'text-cyan-600',
    address: 'text-slate-700',
    divider: 'bg-slate-200',
    indicator: {
      complete: 'bg-cyan-500',
      partial: 'bg-amber-500',
      none: 'bg-slate-300',
    },
  },
}

/**
 * Wallet connection button.
 *
 * Shows "Connect" when disconnected, or the connected address
 * with balance and auth status when connected.
 */
export function WalletButton({ className = '', variant = 'dark' }: WalletButtonProps) {
  const { address, isConnected } = useAppKitAccount()
  const { disconnect } = useDisconnect()
  const { isAuthenticated, hasKeys, isFullySignedIn, isLoading, signOut } = useSignIn()
  const { hasPoolKeys, totalBalance: poolBalance } = usePoolContext()
  const [showModal, setShowModal] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const variantStyles = styles[variant]

  // Fetch real balance from RPC
  const { data: balance } = useBalance({
    address: address as `0x${string}` | undefined,
  })

  // Format pool balance for display
  const poolBalanceFormatted =
    hasPoolKeys && poolBalance > 0n ? formatBalance(poolBalance, 18) : null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Handle button click
  const handleClick = () => {
    if (!isConnected) {
      // Not connected - show sign-in modal
      setShowModal(true)
    } else {
      // Connected - toggle dropdown
      setShowDropdown(!showDropdown)
    }
  }

  // Handle disconnect
  const handleDisconnect = async () => {
    setShowDropdown(false)
    await signOut()
    disconnect()
  }

  // Handle complete setup
  const handleCompleteSetup = () => {
    setShowDropdown(false)
    setShowModal(true)
  }

  if (isConnected && address) {
    // Get auth status indicator color
    const indicatorColor = isFullySignedIn
      ? variantStyles.indicator.complete
      : isAuthenticated || hasKeys
        ? variantStyles.indicator.partial
        : variantStyles.indicator.none

    return (
      <>
        <div className={cn('relative flex items-center gap-1.5', className)} ref={dropdownRef}>
          <button
            onClick={handleClick}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-lg shadow-black/10 backdrop-blur-xl transition-all',
              variantStyles.button
            )}
          >
            {/* Auth status indicator */}
            <span
              className={cn('h-2 w-2 rounded-full transition-colors', indicatorColor)}
              title={
                isFullySignedIn
                  ? 'Fully authenticated'
                  : isAuthenticated
                    ? 'Signed in, keys pending'
                    : hasKeys
                      ? 'Keys ready, sign-in pending'
                      : 'Not authenticated'
              }
            />

            {/* Wallet Balance */}
            <span className={cn('font-semibold', variantStyles.balance)}>
              {formatBalance(balance?.value, balance?.decimals)} {balance?.symbol ?? 'MNT'}
            </span>

            {/* Pool Balance - shown if user has pool keys and balance */}
            {poolBalanceFormatted && (
              <>
                <span className={cn('h-4 w-px', variantStyles.divider)} />
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <Shield className="h-3.5 w-3.5" />
                  {poolBalanceFormatted}
                </span>
              </>
            )}

            <span className={cn('h-4 w-px', variantStyles.divider)} />

            {/* Address */}
            <span className={variantStyles.address}>{formatAddress(address)}</span>

            {/* Dropdown indicator */}
            <ChevronDown
              className={cn(
                'h-3 w-3 opacity-60 transition-transform',
                showDropdown && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown menu - positioned below button */}
          {showDropdown && (
            <div className="bg-card border-border absolute right-0 top-full z-[100] mt-2 w-48 rounded-xl border py-1 shadow-lg">
              {!isFullySignedIn && (
                <button
                  onClick={handleCompleteSetup}
                  className="text-foreground hover:bg-muted flex w-full items-center gap-2 px-4 py-2 text-left text-sm"
                >
                  <UserCircle className="h-4 w-4" />
                  Complete Setup
                </button>
              )}
              <button
                onClick={handleDisconnect}
                className="hover:bg-destructive/10 text-destructive flex w-full items-center gap-2 px-4 py-2 text-left text-sm"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </button>
            </div>
          )}
        </div>

        <SignInModal open={showModal} onOpenChange={setShowModal} />
      </>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50',
          variantStyles.connect,
          className
        )}
      >
        <Wallet className="h-4 w-4" />
        Connect
      </button>

      <SignInModal open={showModal} onOpenChange={setShowModal} />
    </>
  )
}

/**
 * Standalone connect button for landing/onboarding pages.
 * Larger size with more prominent styling.
 */
export function ConnectButton({ className = '' }: WalletButtonProps) {
  const { isConnected } = useAppKitAccount()
  const [showModal, setShowModal] = useState(false)

  if (isConnected) {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={cn(
          'flex cursor-pointer items-center justify-center gap-2 rounded-full bg-cyan-600/80 px-6 py-3 text-base font-medium text-white shadow-lg shadow-cyan-600/20 transition-all hover:bg-cyan-500/80 hover:shadow-cyan-500/30',
          className
        )}
      >
        <Wallet className="h-5 w-5" />
        Connect Wallet
      </button>

      <SignInModal open={showModal} onOpenChange={setShowModal} />
    </>
  )
}

/**
 * Auth status badge component.
 * Shows icons for current auth state.
 */
export function AuthStatusBadge({ className = '' }: { className?: string }) {
  const { isAuthenticated, hasKeys, isConnected } = useSignIn()

  if (!isConnected) return null

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <span title={isAuthenticated ? 'Signed in' : 'Not signed in'}>
        <Shield
          className={cn('h-3.5 w-3.5', isAuthenticated ? 'text-cyan-400' : 'text-white/30')}
        />
      </span>
      <span title={hasKeys ? 'Keys ready' : 'Keys not derived'}>
        <Key className={cn('h-3.5 w-3.5', hasKeys ? 'text-cyan-400' : 'text-white/30')} />
      </span>
    </div>
  )
}
