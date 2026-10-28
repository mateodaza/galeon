/**
 * Single source of truth for public site identity and links. Change the domain
 * here when the new one is live; metadata, sitemap, robots and JSON-LD all read
 * from this file. The public pages name no chain; the wallet app reads its
 * chain and contract addresses from `lib/chains.ts` and `lib/contracts.ts`.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.galeon.finance'
export const SITE_NAME = 'Galeon'
export const SITE_TAGLINE = 'Open-source privacy for public blockchains'
export const SITE_DESCRIPTION =
  'An open-source privacy protocol for public blockchains. Payments land at one-time addresses instead of your wallet, and you choose who sees the record.'

/** Public contact address; the contact links become a mailto. Leave empty to fall back to GitHub issues. */
export const CONTACT_EMAIL = 'hello@galeon.finance'

/** Square logo used by JSON-LD, the wallet modal and the manifest. */
export const LOGO_PNG = '/brand/galeon-icon-512.png'

export const LINKS = {
  github: 'https://github.com/mateodaza/galeon',
  litepaper: 'https://github.com/mateodaza/galeon/blob/main/LITEPAPER.md',
  issues: 'https://github.com/mateodaza/galeon/issues',
  license: 'https://github.com/mateodaza/galeon/blob/main/LICENSE',
  eip5564: 'https://eips.ethereum.org/EIPS/eip-5564',
  eip6538: 'https://eips.ethereum.org/EIPS/eip-6538',
  privacyPoolsPaper: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4563364',
  oxbow: 'https://github.com/0xbow-io',
  dpga: 'https://www.digitalpublicgoods.net/standard',
  app: '/dashboard',
} as const

export const ORG = {
  name: 'CartagenaOnChain',
  url: 'https://cartagenaonchain.org/',
  x: 'https://x.com/ctg_onchain',
  linkedin: 'https://www.linkedin.com/company/cartagenaonchain/',
} as const

/** Section links in the site nav. They point at the landing, so they work from every page. */
export const NAV = [
  { href: '/#how', label: 'How it works' },
  { href: '/#who', label: 'Who sees what' },
  { href: '/about', label: 'About' },
  { href: '/roadmap', label: 'Roadmap' },
] as const
