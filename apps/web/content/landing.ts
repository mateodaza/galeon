/**
 * Landing copy. Every word on `/` lives here.
 *
 * Source: research/round4/copy/final.json (25 October 2026), revised after
 * the October review: no chain named, no status disclaimers, shorter body
 * copy, and a framework view of trust. The brand name comes from `SITE_NAME`
 * in `lib/site.ts`; change it there. Two lines depend on the name itself and
 * must be rewritten if it changes: the copyright line and the mark's
 * accessible name.
 *
 * Display titles are lists of [line, hang] pairs (hang in em) for desktop,
 * plus the phone break. Every line ends where a phrase ends. A hang is kept
 * only where it lines a word up with a word above it. `size` is the desktop
 * size in px at a 1344 px content column, and the phone size in px at 390 px
 * wide.
 *
 * In copy rendered through `Phrased`, " | " marks a place where a line may
 * break between two phrases; it is drawn as a plain space. Lines then break
 * only there and at sentence (or clause) ends.
 */
import { CONTACT_EMAIL, LINKS, NAV, ORG, SITE_NAME } from '@/lib/site'

const BRAND = SITE_NAME

export interface SiteLink {
  readonly label: string
  readonly href: string
  /** Opens another site; drawn with the outbound arrow. */
  readonly external?: boolean
}

export interface DisplayTitle {
  readonly lines: readonly (readonly [text: string, hang: number])[]
  readonly phone: readonly string[]
  readonly size?: { readonly desktop: number; readonly phone: number }
  /** A word that arrives redacted and is disclosed a moment later (styles/hero.css). */
  readonly redact?: string
}

export interface Step {
  readonly n: string
  readonly name: string
  readonly line: string
  readonly text: string
  readonly mono: string
}

const CONTACT: SiteLink = CONTACT_EMAIL
  ? { label: 'Write to the team', href: `mailto:${CONTACT_EMAIL}` }
  : { label: 'Write to the team', href: LINKS.issues, external: true }

const LITEPAPER: SiteLink = { label: 'Litepaper', href: LINKS.litepaper, external: true }
const SOURCE: SiteLink = { label: 'Source', href: LINKS.github, external: true }
const VIEW_SOURCE: SiteLink = { label: 'View the source', href: LINKS.github, external: true }

export const META = {
  title: `${BRAND} · Open-source privacy for public blockchains`,
  // chat apps show this as the link preview's headline: it names the brand, as the tab title does
  ogTitle: `${BRAND} · Privacy at the level you need`,
  ogDescription: `${BRAND} is an open-source privacy protocol for public blockchains, built in Colombia. Stealth addresses, privacy pools and zero-knowledge proofs, used as far as you need.`,
} as const

export const NAV_COPY = {
  home: `${BRAND} home`,
  skip: 'Skip to content',
  links: NAV,
  tools: [LITEPAPER, SOURCE],
  menu: 'Menu',
  close: 'Close',
  /** The bar's theme button: pressed means dark is on. */
  theme: { label: 'Dark theme' },
} as const

export const HERO = {
  eyebrow: 'Open-source privacy protocol',
  title: {
    lines: [
      ['Privacy', 0],
      ['at the level', 0],
      ['you need.', 0],
    ],
    phone: ['Privacy', 'at the level', 'you need.'],
  } satisfies DisplayTitle,
  /** Rendered as one paragraph with the three technologies in bold. */
  lede: {
    lead: `${BRAND} keeps payments on public blockchains private with`,
    tech: ['stealth addresses', 'privacy pools', 'zero-knowledge proofs'],
    tail: 'Use only what you need.',
  },
  primary: { label: 'See how it works', href: '#how' } satisfies SiteLink,
  secondary: VIEW_SOURCE,
  markLabel: `The ${BRAND} mark, engraved in lines`,
} as const

export const WHY = {
  label: 'On a public chain',
  title: {
    lines: [
      ['One address.', 0],
      ['Your whole history.', 0],
    ],
    phone: ['One address.', 'Your whole history.'],
    size: { desktop: 124, phone: 44 },
  } satisfies DisplayTitle,
  body: 'Anyone who pays you, or gets paid by you, | can read every payment you have ever made.',
} as const

export const HOW = {
  label: 'How it works',
  title: {
    lines: [
      ['Three levels', 0],
      ['of privacy.', 0],
    ],
    phone: ['Three levels', 'of privacy.'],
    size: { desktop: 124, phone: 44 },
    redact: 'privacy',
  } satisfies DisplayTitle,
  lede: 'Start with the first level. Add the other two when you need them.',
  steps: [
    {
      n: '01',
      name: 'Hidden in plain sight',
      mono: 'One-time addresses · EIP-5564',
      line: 'Each payment lands | at its own one-time address.',
      text: 'A Port is a payment link you share. Every payment through it gets a fresh address that only your keys can spend from. The Port itself is public, with the wallet that created it, so create it from a wallet that does not name you. Payers use the wallet they already have.',
    },
    {
      n: '02',
      name: 'Out of reach',
      mono: 'Approval-gated pool · Privacy Pools model',
      line: 'Funds pass through an approval-gated pool, | and the chain stops showing | which deposit paid which withdrawal.',
      text: 'Only money that came through a Port can enter. Your browser proves your deposit is in the approved set without saying which one, and the contract checks that proof on-chain. Who approves deposits is up to whoever runs it: the reference deployment approves every one.',
    },
    {
      n: '03',
      name: 'Yours to tell',
      mono: 'Selective disclosure · PDF reports',
      line: 'When someone needs the record, you choose what they see.',
      text: 'Make a report for a period, for one Port or all of them, and send it yourself. Nothing is published.',
    },
  ] satisfies readonly Step[],
  diagram: {
    payers: 'payers',
    addresses: 'one-time addresses',
    recipient: 'you',
    port: 'one Port link',
    approved: 'approved set',
    pool: 'shared pool',
    proof: 'proof',
    report: 'Report',
    period: 'Jan to Mar 2026',
    scope: 'Port: all',
    cols: ['date', 'amount', 'from'],
    reader: 'auditor',
    sent: 'sent by you',
    receiveAlt:
      'Three payers use the same Port link. Each payment lands at its own one-time address.',
    settleAlt:
      'Deposits enter a shared pool. A withdrawal proves its deposit is in the approved set without saying which one.',
    proveAlt: 'A report for one period and all Ports, sent by you to one reader.',
  },
} as const

export const PRINCIPLE = {
  title: {
    lines: [
      ['Privacy is a right.', 0],
      ['Compliance is a responsibility.', 0],
    ],
    phone: ['Privacy', 'is a right.', 'Compliance', 'is a responsibility.'],
    size: { desktop: 108, phone: 44 },
  } satisfies DisplayTitle,
  body: 'So the pool asks for both. A withdrawal can stay private only if its deposit was approved.',
} as const

export const WHO = {
  label: 'Who sees what',
  title: {
    /** The second line starts under "depends": the answer sits under the word it answers. */
    lines: [
      ['It depends', 0],
      ['on who is looking.', 0.61],
    ],
    phone: ['It depends', 'on who', 'is looking.'],
    size: { desktop: 124, phone: 44 },
  } satisfies DisplayTitle,
  lede: `What each party can learn, including whoever runs ${BRAND}.`,
  cols: { who: 'Who', sees: 'Sees', hidden: 'Does not see' },
  /** One short line a cell: the detail is in the litepaper's trust model (TRUST.link). */
  rows: [
    {
      who: 'Anyone reading the chain',
      sees: 'Each payment, its Port and the wallet that created the Port. Every pool deposit and withdrawal.',
      hidden: 'Which deposit paid which withdrawal, though a small pool can still hint.',
    },
    {
      who: 'Whoever pays you',
      sees: "What they paid, and the Port's other payments.",
      hidden: 'Your keys, or where funds go after a private withdrawal.',
    },
    {
      who: `Whoever runs ${BRAND}`,
      sees: 'Payments to the Ports whose viewing keys it holds, and which of your deposits became which withdrawals.',
      hidden: 'Your spending keys, so its viewing keys alone cannot spend.',
    },
    {
      who: 'An auditor you choose',
      sees: 'The report you hand over.',
      hidden: 'Anything else the chain does not already show.',
    },
  ],
} as const

/** Under the table: where the trust sits, as two short lists. */
export const TRUST = {
  holds: {
    title: 'Holds by design',
    items: [
      'Spending keys stay on your device',
      'Proofs are verified on-chain',
      'Only money that came through a Port enters the pool',
      'Any deposit can be taken back, in public',
      'Open source: MIT, Apache-2.0 and GPL-3.0',
    ],
  },
  operator: {
    title: 'Set by whoever runs it',
    items: [
      'Who holds viewing keys',
      'Screening: the reference deployment approves every deposit',
      'Which relayers send withdrawals',
      'Who runs the proving setup',
      'Who can upgrade or pause the contracts',
    ],
  },
  qualifier:
    'The first list holds while the contracts run as deployed: | whoever can upgrade them can change it.',
  link: {
    label: 'Trust model and known limitations',
    href: `${LINKS.litepaper}#4-trust-model-and-current-limitations`,
    external: true,
  } satisfies SiteLink,
} as const

export const AUDIENCE = {
  label: 'Who it is for',
  title: {
    lines: [
      ['For anyone', 0],
      ['on the receiving end.', 0],
    ],
    phone: ['For anyone', 'on the receiving end.'],
    size: { desktop: 112, phone: 40 },
  } satisfies DisplayTitle,
  items: [
    [
      'Programmes',
      'Aid and cash-transfer programmes that pay people on a public chain, without each payment landing in a wallet that names the person.',
    ],
    [
      'Organisations',
      "Teams that pay staff or suppliers on a public chain, without every payment landing in someone's everyday wallet.",
    ],
    [
      'People',
      'Anyone paid on a public chain who would rather their payments did not pile up in one wallet anyone can read.',
    ],
  ] as const,
  developers:
    'Developers can read and fork the contracts | and the stealth address library on GitHub.',
} as const

export const CLOSE = {
  title: {
    lines: [
      ['Yours', 0],
      ['to tell.', 0],
    ],
    phone: ['Yours to tell.'],
    size: { desktop: 200, phone: 64 },
  } satisfies DisplayTitle,
  body: `If you pay people on a public chain, write to us. We would like to run ${BRAND} with you, under your own policy.`,
  primary: CONTACT,
  secondary: VIEW_SOURCE,
} as const

export const FOOTER = {
  lines: [
    `${BRAND} is an open-source privacy protocol | for public blockchains, built in Colombia | at ${ORG.name}.`,
  ],
  cols: [
    {
      title: 'Protocol',
      links: [
        // the landing's own sections; About and Roadmap sit under Project
        ...NAV.filter((l) => l.href.startsWith('/#')).map((l) => ({
          label: l.label,
          href: l.href,
        })),
        { label: 'Litepaper', href: LINKS.litepaper, external: true },
      ],
    },
    {
      title: 'Source',
      links: [
        { label: 'GitHub', href: LINKS.github, external: true },
        { label: 'Licence', href: LINKS.license, external: true },
      ],
    },
    {
      title: 'Project',
      links: [
        { label: 'About', href: '/about' },
        { label: 'Roadmap', href: '/roadmap' },
        { label: ORG.name, href: ORG.url, external: true },
        { ...CONTACT, label: 'Contact' },
      ],
    },
  ] satisfies readonly { title: string; links: readonly SiteLink[] }[],
  base: [
    `© 2026 ${BRAND} contributors`,
    'MIT, Apache-2.0 and GPL-3.0',
    'No cookies or trackers on these pages',
  ],
  /** The site before the October 2026 rebuild, kept at /legacy. */
  legacy: { label: 'Previous site', href: '/legacy' } satisfies SiteLink,
} as const
