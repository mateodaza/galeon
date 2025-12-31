'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Ship, Menu, X } from 'lucide-react'
import { WalletButton } from '@/components/wallet-button'

const navLinks = [
  { href: '#how-it-works', label: 'How it Works' },
  { href: '/about', label: 'About' },
  { href: '/dashboard', label: 'Dashboard' },
]

/**
 * Floating navigation bar inspired by Dune's design.
 * Transparent glass effect with rounded corners, centered nav links.
 * Responsive: hamburger menu on mobile.
 */
export function FloatingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      {/* Desktop Nav */}
      <nav className="mx-auto hidden w-fit items-center gap-1 rounded-full border border-white/20 bg-slate-900/50 px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-xl sm:flex">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full px-4 py-2 transition-colors hover:bg-white/10"
        >
          <Ship className="h-5 w-5 text-cyan-300" />
          <span className="font-semibold text-white">Galeon</span>
        </Link>

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-white/20" />

        {/* Nav Links */}
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-full px-4 py-2 text-sm text-cyan-100/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {link.label}
          </Link>
        ))}

        {/* Divider */}
        <div className="mx-1 h-6 w-px bg-white/20" />

        {/* CTA */}
        <div className="pl-1">
          <WalletButton />
        </div>
      </nav>

      {/* Mobile Nav */}
      <nav className="mx-auto flex w-full max-w-md items-center justify-between rounded-full border border-white/20 bg-slate-900/50 px-3 py-2 shadow-lg shadow-black/10 backdrop-blur-xl sm:hidden">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 rounded-full px-2 py-1">
          <Ship className="h-5 w-5 text-cyan-300" />
          <span className="font-semibold text-white">Galeon</span>
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="rounded-full p-2 text-cyan-100/80 transition-colors hover:bg-white/10 hover:text-white"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="mx-auto mt-2 w-full max-w-md rounded-2xl border border-white/20 bg-slate-900/70 p-4 shadow-lg shadow-black/10 backdrop-blur-xl sm:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-center text-cyan-100/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-white/10 pt-4">
              <WalletButton />
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
