'use client'

/**
 * Collectable balance display component.
 *
 * Separated from wallet-button to avoid importing @galeon/pool
 * during SSR/build which causes BigInt errors.
 */

import { useEffect, useRef, useState } from 'react'
import { Anchor, RefreshCw } from 'lucide-react'
import { useAccount } from 'wagmi'
import { formatUnits } from 'viem'
import { cn } from '@/lib/utils'
import { useSignIn } from '@/hooks/use-sign-in'
import { useCollection } from '@/hooks/use-collection'

interface CollectableBalanceProps {
  dividerClassName?: string
}

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

/**
 * Display collectable balance from blockchain scan.
 * Only renders on client-side to avoid SSR issues with @galeon/pool.
 */
export function CollectableBalance({ dividerClassName = 'bg-white/20' }: CollectableBalanceProps) {
  const { address, chainId } = useAccount()
  const { isAuthenticated } = useSignIn()
  const {
    totalBalance: collectableBalance,
    isScanning,
    hasKeys: hasCollectionKeys,
    scan,
  } = useCollection()

  const hasScannedRef = useRef(false)
  const prevAddressRef = useRef<string | undefined>(undefined)
  const prevChainIdRef = useRef<number | undefined>(undefined)

  // Reset scan state when wallet address, chain, or keys change
  useEffect(() => {
    const addressChanged = address !== prevAddressRef.current
    const chainChanged = chainId !== prevChainIdRef.current && prevChainIdRef.current !== undefined

    if (!hasCollectionKeys || addressChanged || chainChanged) {
      hasScannedRef.current = false
    }

    prevAddressRef.current = address
    prevChainIdRef.current = chainId
  }, [hasCollectionKeys, address, chainId])

  // Auto-scan for collectable balance when keys are available (only once per session)
  useEffect(() => {
    if (hasCollectionKeys && !hasScannedRef.current && !isScanning) {
      hasScannedRef.current = true
      scan()
    }
  }, [hasCollectionKeys, isScanning, scan])

  // Format collectable balance (from blockchain scan)
  const portBalanceFormatted =
    isAuthenticated && collectableBalance > 0n ? formatBalance(collectableBalance, 18) : null

  // Only show if authenticated and has balance or is scanning
  if (!isAuthenticated || (!portBalanceFormatted && !isScanning)) {
    return null
  }

  return (
    <>
      <span className={cn('h-4 w-px', dividerClassName)} />
      <span
        className="flex items-center gap-1 font-semibold text-amber-400"
        title="Available to collect from your Ports"
      >
        <Anchor className={cn('h-3.5 w-3.5', isScanning && 'animate-pulse')} />
        {isScanning ? '...' : `${portBalanceFormatted} MNT`}
      </span>
    </>
  )
}

interface RescanButtonProps {
  onClose?: () => void
}

/**
 * Rescan button for the wallet dropdown.
 * Isolated to avoid importing @galeon/pool in wallet-button.
 */
export function RescanButton({ onClose }: RescanButtonProps) {
  const { isScanning, scan, hasKeys: hasCollectionKeys } = useCollection()
  const [isSyncing, setIsSyncing] = useState(false)

  const handleRescan = async () => {
    if (isSyncing || isScanning) return
    setIsSyncing(true)
    onClose?.()
    try {
      await scan()
    } catch (err) {
      console.error('Failed to rescan:', err)
    } finally {
      setIsSyncing(false)
    }
  }

  if (!hasCollectionKeys) {
    return null
  }

  return (
    <button
      onClick={handleRescan}
      disabled={isSyncing || isScanning}
      className="text-foreground hover:bg-muted flex w-full items-center gap-2 px-4 py-2 text-left text-sm disabled:opacity-50"
    >
      <RefreshCw className={cn('h-4 w-4', (isSyncing || isScanning) && 'animate-spin')} />
      {isSyncing || isScanning ? 'Scanning...' : 'Rescan Payments'}
    </button>
  )
}
