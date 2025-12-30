'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ship } from 'lucide-react'
import { WalletButton } from '@/components/wallet-button'
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

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Ship className="text-primary h-6 w-6" />
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
      {showWallet && <WalletButton />}
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
