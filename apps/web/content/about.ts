/**
 * About page copy. Same voice and rules as `content/landing.ts`: "you" is the
 * person being paid, every sentence describes what the code does, and a line
 * says what a paragraph would. No chain is named here; the brand name comes
 * from `lib/site.ts`.
 */
import type { DisplayTitle, SiteLink } from '@/content/landing'
import { LINKS, ORG, SITE_NAME } from '@/lib/site'

const BRAND = SITE_NAME

export const ABOUT = {
  label: 'About',
  meta: {
    title: `About ${BRAND}`,
    description: `What ${BRAND} is, how its three levels of privacy fit together, and where its open-source code lives.`,
  },
  og: [
    ['Privacy', 0],
    ['anyone can run.', 0],
  ] as const,
  title: {
    lines: [
      ['Privacy', 0],
      ['anyone can run.', 0],
    ],
    phone: ['Privacy', 'anyone can run.'],
    size: { desktop: 124, phone: 44 },
  } satisfies DisplayTitle,
  /** Rendered through `Phrased` with clauses; " | " marks a phrase break. */
  intro: [
    `${BRAND} is an open-source privacy protocol | for public blockchains. Payments land at one-time addresses, | not your wallet, | and you choose who sees the record.`,
    'A programme or a company can run its own deployment, | under its own rules.',
  ],
  what: {
    label: 'What it is',
    title: {
      lines: [
        ['Three levels,', 0],
        ['added when needed.', 0],
      ],
      phone: ['Three levels,', 'added when needed.'],
      size: { desktop: 124, phone: 40 },
    } satisfies DisplayTitle,
    lede: 'Contracts, a stealth address library and a reference app. | Your spending keys stay on your device.',
    layers: [
      {
        n: '01',
        name: 'Hidden in plain sight',
        text: 'Each payment to a Port lands at a fresh one-time address (EIP-5564). The Port itself is public, and so is the wallet that made it.',
      },
      {
        n: '02',
        name: 'Out of reach',
        text: 'Money from a Port can enter a shared pool and leave by a zero-knowledge proof that hides which deposit it was. The operator approves deposits; the reference deployment approves them all.',
      },
      {
        n: '03',
        name: 'Yours to tell',
        text: 'When a tax office, an auditor or a donor asks, you make a report and send it yourself. Nothing is published.',
      },
    ],
    after: 'Start with Ports. | Add the pool and reports when you need them.',
    links: [
      { label: 'Where the trust sits', href: '/#trust' },
      { label: 'Roadmap', href: '/roadmap' },
    ] satisfies readonly SiteLink[],
  },
  open: {
    label: 'Open source',
    title: {
      lines: [['Built in the open.', 0]],
      phone: ['Built in the open.'],
      size: { desktop: 124, phone: 44 },
    } satisfies DisplayTitle,
    /** Rendered through `Phrased` by sentence; " | " marks a phrase break. */
    body: `Contracts, app and libraries are on GitHub | under MIT, Apache-2.0 and GPL-3.0. Built in Colombia, | at ${ORG.name}.`,
    links: [
      { label: 'GitHub', href: LINKS.github, external: true },
      { label: 'Litepaper', href: LINKS.litepaper, external: true },
      { label: 'Licence', href: LINKS.license, external: true },
      { label: ORG.name, href: ORG.url, external: true },
    ] satisfies readonly SiteLink[],
  },
} as const
