/**
 * About page copy. Same voice and rules as `content/landing.ts`: "you" is the
 * person being paid, every sentence describes what the code does. No chain is
 * named here; the brand name comes from `lib/site.ts`.
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
    lines: [['Privacy anyone can run.', 0]],
    phone: ['Privacy', 'anyone can run.'],
    size: { desktop: 112, phone: 48 },
  } satisfies DisplayTitle,
  /** Rendered through `Phrased` with clauses; " | " marks a phrase break. */
  intro: [
    `${BRAND} is an open-source privacy protocol | for public blockchains. People and organisations get paid | at one-time addresses instead of their wallet, | and can still show the record | to whoever needs it.`,
    'It is a framework. A programme or a company | can run its own deployment, and decide who holds viewing keys | and who screens deposits.',
  ],
  what: {
    label: 'What it is',
    title: {
      lines: [
        ['Three levels,', 0],
        ['added when needed.', 0],
      ],
      phone: ['Three levels,', 'added when needed.'],
      size: { desktop: 96, phone: 39 },
    } satisfies DisplayTitle,
    lede: `${BRAND} comes as contracts, a stealth address library and a reference app. Your spending keys stay on your device.`,
    layers: [
      {
        n: '01',
        name: 'Hidden in plain sight',
        text: 'A Port is a payment link backed by a stealth meta-address. Each payment lands at a fresh one-time address under EIP-5564. Port keys are derived using a Port-specific index. The current 32-bit index can collide, causing two Ports under the same master signature to share keys. Full-identifier derivation is planned.',
      },
      {
        n: '02',
        name: 'Out of reach',
        text: 'Money that arrived through a Port can enter a shared pool. A private withdrawal proves its deposit is in the approved set without saying which one. This is the model from the Privacy Pools paper. Who approves deposits is up to whoever runs it; the reference deployment approves every one.',
      },
      {
        n: '03',
        name: 'Yours to tell',
        text: 'When a tax office, an auditor or a donor asks, you make a report for a period, for one Port or all of them, and send it yourself. Nothing is published.',
      },
    ],
    after:
      'Ports work on their own, and the pool and reports build on them. A programme can start with Ports | and add the pool, under its own screening, when it needs it.',
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
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    /** Rendered through `Phrased` by sentence; " | " marks a phrase break. */
    body: `The contracts, the app and the libraries | are public on GitHub | under MIT, Apache-2.0 and GPL-3.0, | so anyone can run a deployment of their own. ${BRAND} is built in Colombia, | at ${ORG.name}.`,
    links: [
      { label: 'GitHub', href: LINKS.github, external: true },
      { label: 'Litepaper', href: LINKS.litepaper, external: true },
      { label: 'Licence', href: LINKS.license, external: true },
      { label: ORG.name, href: ORG.url, external: true },
    ] satisfies readonly SiteLink[],
  },
  mark: {
    label: 'The mark',
    title: {
      lines: [
        ['Five circles', 0],
        ['and two curves.', 0],
      ],
      phone: ['Five circles', 'and two curves.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    body: 'The crescent opens up and to the right. Two sails stand inside it, and the gap between them is the mast. A wave is cut into the lower horn.',
    figure: `The ${BRAND} mark over its construction lines`,
  },
} as const
