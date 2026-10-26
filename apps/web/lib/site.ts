/**
 * Single source of truth for public site identity, links and on-chain references.
 * Change the domain here when the new one is live; metadata, sitemap, robots and
 * JSON-LD all read from this file.
 */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.galeon.finance'
export const SITE_NAME = 'Galeon'
export const SITE_TAGLINE = 'Open-source privacy for public blockchains'
export const SITE_DESCRIPTION =
  'An open-source privacy protocol in development. Be paid on a public blockchain without exposing your history, and show the record to whoever needs it.'

/** Public contact address. Empty until the new domain's mailbox exists; links fall back to GitHub issues. */
export const CONTACT_EMAIL = ''

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
  name: 'Cartagena On Chain',
  url: 'https://cartagenaonchain.org/',
  x: 'https://x.com/ctg_onchain',
  linkedin: 'https://www.linkedin.com/company/cartagenaonchain/',
} as const

export const TEAM = [
  {
    name: 'Mateo Daza',
    role: 'Co-founder · Technical lead',
    bio: 'Led frontend at Asymmetry Finance and engineering at Giveth. Co-founded Ethereum Colombia.',
    links: {
      github: 'https://github.com/mateodaza',
      linkedin: 'https://linkedin.com/in/mateo-daza-448469170',
    },
  },
  {
    name: 'Carlos Quintero',
    role: 'Co-founder · Protocol engineer',
    bio: 'Backend and multi-chain infrastructure at Giveth, fintech and e-commerce at Koombea.',
    links: {
      github: 'https://github.com/CarlosQ96',
      linkedin: 'https://linkedin.com/in/carlos-quintero-076a36153',
    },
  },
  {
    name: 'Fabio Anaya',
    role: 'Co-founder · Operations',
    bio: 'Founder of Cartagena On Chain. Partnerships, pilots and ecosystem work across Latin America.',
    links: {
      linkedin: 'https://www.linkedin.com/in/fabioanaya',
    },
  },
] as const

export const CHAIN = {
  name: 'Mantle',
  explorer: 'https://mantlescan.xyz/address/',
} as const

export const CONTRACTS = [
  {
    group: 'Stealth',
    name: 'GaleonRegistry',
    address: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D',
  },
  {
    group: 'Stealth',
    name: 'ERC5564Announcer',
    address: '0x8C04238c49e22EB687ad706bEe645698ccF41153',
  },
  {
    group: 'Stealth',
    name: 'ERC6538Registry',
    address: '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22',
  },
  {
    group: 'Pool',
    name: 'GaleonEntrypoint',
    address: '0x8633518fbbf23E78586F1456530c3452885efb21',
  },
  {
    group: 'Pool',
    name: 'GaleonPrivacyPool',
    address: '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0',
  },
  {
    group: 'Pool',
    name: 'WithdrawalVerifier',
    address: '0x4894F811D370d987B55bE4e5eeA48588d6545a32',
  },
  {
    group: 'Pool',
    name: 'RagequitVerifier',
    address: '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803',
  },
  {
    group: 'Pool',
    name: 'MergeDepositVerifier',
    address: '0x05DB69e37b8c7509E9d97826249385682CE9b29d',
  },
] as const

/** The dated status line used on the Roadmap page. Keep it honest and dated. */
export const STATUS = {
  label: 'Prototype',
  detail: 'Mantle mainnet, not audited. Hosted app paused. Next: Base with USDC.',
  asOf: 'October 2026',
} as const

/** Section links in the site nav. They point at the landing, so they work from every page. */
export const NAV = [
  { href: '/#how', label: 'How it works' },
  { href: '/#who', label: 'Who sees what' },
  { href: '/#trust', label: 'Trust' },
] as const
