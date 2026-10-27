/**
 * Routes of the previous public site, kept reachable under /legacy.
 * Links into the wallet app (/setup, /dashboard, /covenant) are shared with
 * the current site and stay as they are.
 */
export const LEGACY_PATHS = {
  home: '/legacy',
  about: '/legacy/about',
  roadmap: '/legacy/roadmap',
} as const

export interface LegacyLink {
  href: string
  label: string
}

/** The floating nav of the previous site, pointed at the legacy routes. */
export const LEGACY_NAV: LegacyLink[] = [
  { href: LEGACY_PATHS.roadmap, label: 'Roadmap' },
  { href: LEGACY_PATHS.about, label: 'About' },
  { href: '/dashboard', label: 'Dashboard' },
]
