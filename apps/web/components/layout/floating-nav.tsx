'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { WalletButton } from '@/components/wallet-button'

interface NavItem {
  href: string
  label: string
}

const defaultNavLinks: NavItem[] = [
  { href: '#how-it-works', label: 'How it Works' },
  { href: '/about', label: 'About' },
  { href: '/dashboard', label: 'Dashboard' },
]

interface FloatingNavProps {
  /**
   * Navigation items. If not provided, shows default landing page nav.
   */
  nav?: NavItem[]
  /**
   * Visual variant for different page backgrounds.
   * @default 'dark'
   */
  variant?: 'dark' | 'light'
}

const variants = {
  dark: {
    nav: 'border-white/20 bg-slate-900/50 shadow-black/10',
    logo: 'text-white hover:bg-white/10',
    divider: 'bg-white/20',
    link: 'text-cyan-100/80 hover:bg-white/10 hover:text-white',
    hamburger: 'text-cyan-100/80 hover:bg-white/10 hover:text-white',
    dropdown: 'border-white/20 bg-slate-900/70',
    dropdownLink: 'text-cyan-100/80 hover:bg-white/10 hover:text-white',
    dropdownBorder: 'border-white/10',
  },
  light: {
    nav: 'border-slate-200/50 bg-white/70 shadow-black/5',
    logo: 'text-slate-900 hover:bg-slate-100/50',
    divider: 'bg-slate-200',
    link: 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900',
    hamburger: 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900',
    dropdown: 'border-slate-200/50 bg-white/90',
    dropdownLink: 'text-slate-600 hover:bg-slate-100/50 hover:text-slate-900',
    dropdownBorder: 'border-slate-200',
  },
}

/**
 * Floating navigation bar inspired by Dune's design.
 * Transparent glass effect with rounded corners, centered nav links.
 * Responsive: hamburger menu on mobile.
 */
export function FloatingNav({ nav, variant = 'dark' }: FloatingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navLinks = nav ?? defaultNavLinks
  const styles = variants[variant]

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      {/* Desktop Nav */}
      <nav
        className={`mx-auto hidden w-fit items-center gap-1 rounded-full border px-2 py-2 shadow-lg backdrop-blur-xl sm:flex ${styles.nav}`}
      >
        {/* Logo */}
        <Link
          href="/"
          className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${styles.logo}`}
        >
          <Image src="/galeon-logo.png" alt="Galeon" width={32} height={32} className="h-8 w-8" />
          <span className="font-semibold">Galeon</span>
        </Link>

        {/* Divider */}
        <div className={`mx-1 h-6 w-px ${styles.divider}`} />

        {/* Nav Links */}
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm transition-colors ${styles.link}`}
          >
            {link.label}
          </Link>
        ))}

        {/* Divider */}
        <div className={`mx-1 h-6 w-px ${styles.divider}`} />

        {/* CTA */}
        <div className="pl-1">
          <WalletButton variant={variant} />
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav
        className={`mx-auto flex w-full max-w-md items-center justify-between rounded-full border px-3 py-2 shadow-lg backdrop-blur-xl sm:hidden ${styles.nav}`}
      >
        {/* Logo */}
        <Link href="/" className={`flex items-center gap-2 rounded-full px-2 py-1 ${styles.logo}`}>
          <Image src="/galeon-logo.png" alt="Galeon" width={32} height={32} className="h-8 w-8" />
          <span className="font-semibold">Galeon</span>
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`rounded-full p-2 transition-colors ${styles.hamburger}`}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div
          className={`mx-auto mt-2 w-full max-w-md rounded-2xl border p-4 shadow-lg backdrop-blur-xl sm:hidden ${styles.dropdown}`}
        >
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-3 text-center transition-colors ${styles.dropdownLink}`}
              >
                {link.label}
              </Link>
            ))}
            <div className={`mt-2 flex justify-center border-t pt-4 ${styles.dropdownBorder}`}>
              <WalletButton variant={variant} />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

/**
 * Default navigation items for dashboard/app pages.
 */
export const dashboardNav: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/receive', label: 'Receive' },
  { href: '/pay', label: 'Pay' },
]
