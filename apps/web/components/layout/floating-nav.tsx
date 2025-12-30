'use client'

import Link from 'next/link'
import { Ship } from 'lucide-react'
import { WalletButton } from '@/components/wallet-button'

const navLinks = [
  { href: '#how-it-works', label: 'How it Works' },
  { href: '/about', label: 'About' },
  { href: '/dashboard', label: 'Dashboard' },
]

/**
 * Floating navigation bar inspired by Dune's design.
 * Transparent glass effect with rounded corners, centered nav links.
 */
export function FloatingNav() {
  return (
    <header className="fixed left-0 right-0 top-4 z-50 mx-auto w-fit px-4">
      <nav className="flex items-center gap-1 rounded-full border border-white/20 bg-slate-900/50 px-2 py-2 shadow-lg shadow-black/10 backdrop-blur-xl">
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
    </header>
  )
}
