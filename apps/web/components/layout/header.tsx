'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { formatEther } from 'viem'
import { Shield } from 'lucide-react'
import { WalletButton } from '@/components/wallet-button'
import { usePoolContext } from '@/contexts/pool-context'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
}

interface HeaderProps {
  /**
   * Navigation items to display. If not provided, shows minimal header.
   */
  nav?: NavItem[]
  /**
   * Whether to show the wallet button.
   * @default true
   */
  showWallet?: boolean
}

/**
 * Shared header component with logo, navigation, and wallet button.
 */
export function Header({ nav, showWallet = true }: HeaderProps) {
  const pathname = usePathname()
  const { hasPoolKeys, totalBalance } = usePoolContext()

  // Format pool balance for display
  const poolBalanceFormatted =
    hasPoolKeys && totalBalance > 0n ? parseFloat(formatEther(totalBalance)).toFixed(4) : null

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/galeon-logo.png" alt="Galeon" width={32} height={32} className="h-8 w-8" />
          <span className="text-foreground text-xl font-bold">Galeon</span>
        </Link>
        {nav && nav.length > 0 && (
          <nav className="flex items-center gap-1">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href} active={pathname === item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-4">
        {/* Pool balance indicator */}
        {poolBalanceFormatted && (
          <Link
            href="/pool"
            className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm transition-colors hover:bg-emerald-500/20"
          >
            <Shield className="h-4 w-4 text-emerald-500" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {poolBalanceFormatted} MNT
            </span>
          </Link>
        )}
        {showWallet && <WalletButton />}
      </div>
    </header>
  )
}

interface NavLinkProps {
  href: string
  children: React.ReactNode
  active?: boolean
}

function NavLink({ href, children, active = false }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        active ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}

/**
 * Default navigation items for authenticated pages.
 */
export const dashboardNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/ports', label: 'Ports' },
  { href: '/collect', label: 'Collect' },
]
