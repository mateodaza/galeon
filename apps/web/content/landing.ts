/**
 * Landing copy. Every word on `/` lives here.
 *
 * Source: research/round4/copy/final.json (25 October 2026), as patched for
 * the approved prototype. The brand name comes from `SITE_NAME` in
 * `lib/site.ts`; change it there. Three lines depend on the name itself and
 * must be rewritten if it changes: the San José footer line, the copyright
 * line and the mark's accessible name.
 *
 * Display titles are lists of [line, hang] pairs (hang in em) for desktop,
 * plus the phone break. `size` is the desktop size in px at a 1344 px
 * content column, and the phone size in px at 390 px wide.
 */
import { CONTACT_EMAIL, CONTRACTS, CHAIN, LINKS, NAV, ORG, SITE_NAME } from '@/lib/site'

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
}

export interface Step {
  readonly n: string
  readonly name: string
  readonly line: string
  readonly text: string
  readonly mono: string
}

export interface TrustItem {
  readonly label: string
  readonly today: string
  readonly plan: string
}

const CONTACT: SiteLink = CONTACT_EMAIL
  ? { label: 'Write to the team', href: `mailto:${CONTACT_EMAIL}` }
  : { label: 'Write to the team', href: LINKS.issues, external: true }

const LITEPAPER: SiteLink = { label: 'Litepaper', href: LINKS.litepaper, external: true }
const SOURCE: SiteLink = { label: 'Source', href: LINKS.github, external: true }
const VIEW_SOURCE: SiteLink = { label: 'View the source', href: LINKS.github, external: true }
const REGISTRY = CONTRACTS.find((c) => c.name === 'GaleonRegistry')

export const META = {
  title: `${BRAND} · Open-source privacy for public blockchains`,
  ogTitle: 'Privacy at the level you need',
  ogDescription: `${BRAND} is an open-source privacy protocol for public blockchains, built in Colombia. Prototype on Mantle mainnet, not audited.`,
} as const

export const NAV_COPY = {
  home: `${BRAND} home`,
  skip: 'Skip to content',
  links: NAV,
  tools: [LITEPAPER, SOURCE],
  menu: 'Menu',
  close: 'Close',
} as const

export const HERO = {
  eyebrow: 'Open-source privacy protocol',
  title: {
    lines: [
      ['Privacy', 0],
      ['at the level', 0.9],
      ['you need.', 2.2],
    ],
    phone: ['Privacy', 'at the level', 'you need.'],
  } satisfies DisplayTitle,
  /** Rendered as one paragraph with the three level names in bold. */
  lede: {
    lead: `${BRAND} gives payments on public blockchains three levels of privacy:`,
    levels: ['hidden in plain sight', 'out of reach', 'yours to tell'],
    tail: 'Use the first on its own, or all three.',
  },
  primary: { label: 'See how it works', href: '#how' } satisfies SiteLink,
  secondary: VIEW_SOURCE,
  status: [
    'Prototype on Mantle mainnet',
    'Not audited',
    'Hosted app paused',
    'Next: Base with USDC',
  ],
  markLabel: `The ${BRAND} mark, engraved in lines`,
} as const

export const FACTS = [
  { term: 'Code', value: 'Open source', detail: 'MIT and Apache-2.0, on GitHub.' },
  {
    term: 'Standards',
    value: 'EIP-5564',
    detail: 'One-time addresses to receive. The Privacy Pools model to settle.',
  },
  {
    term: 'Status',
    value: 'Prototype',
    detail: 'Mantle mainnet, not audited. Hosted app paused. Next: Base with USDC.',
  },
  { term: 'Made in', value: 'Colombia', detail: `By ${ORG.name}.` },
] as const

export const WHY = {
  n: '01',
  label: 'On a public chain',
  title: {
    lines: [
      ['Anyone who learns', 0],
      ['your address can read', 0.8],
      ['your whole history.', 0],
    ],
    phone: ['Anyone who learns', 'your address', 'can read your', 'whole history.'],
    size: { desktop: 112, phone: 36 },
  } satisfies DisplayTitle,
  body: [
    "For a family receiving cash aid, that history is one more line in a programme's public payouts, and a single cash-out can put a name to it.",
    'For a carpenter paid in USDC, it is her income, open to every shop she pays.',
  ],
} as const

export const HOW = {
  n: '02',
  label: 'How it works',
  title: {
    lines: [
      ['Three levels', 0],
      ['of privacy.', 1.6],
    ],
    phone: ['Three levels', 'of privacy.'],
    size: { desktop: 140, phone: 48 },
  } satisfies DisplayTitle,
  lede: 'The first level works on its own. The other two build on it, so a programme can start with the first and add the others when it needs them.',
  steps: [
    {
      n: '01',
      name: 'Hidden in plain sight',
      mono: 'One-time addresses · EIP-5564',
      line: 'Each payment lands at its own one-time address, not at your wallet.',
      text: 'A Port is a payment link you share with whoever pays you. Every payment through it lands at a fresh one-time address made for that payment under the EIP-5564 standard, and only your keys can spend from it. Each Port has its own keys, so one leaked viewing key exposes only that Port. Payers use the wallet they already have.',
    },
    {
      n: '02',
      name: 'Out of reach',
      mono: 'Screened pool · Privacy Pools model',
      line: 'Move funds through a screened pool, so the chain no longer shows which deposit paid for which withdrawal.',
      text: 'Money that arrived through a Port can go into the pool, and nothing else can. To take it out privately, your browser builds a zero-knowledge proof that your deposit is in the approved set. The proof names the set, never the deposit, and the contract checks it on-chain. A deposit that is never approved can still be taken back, in public, by the address that made it.',
    },
    {
      n: '03',
      name: 'Yours to tell',
      mono: 'Selective disclosure · PDF reports',
      line: 'When someone needs the record, you choose what they see.',
      text: 'When a tax office or an auditor asks for evidence, you make a report for the period you choose, for one Port or all of them, and send it yourself. Nothing is published. Reports follow US and Colombian tax formats today, and formats for programmes and their donors are planned.',
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
    proveAlt: 'A report for one period and the Ports you choose, sent by you to one reader.',
  },
} as const

export const PRINCIPLE = {
  title: {
    lines: [
      ['Privacy is a right.', 0],
      ['Compliance is', 1.6],
      ['a responsibility.', 1.6],
    ],
    phone: ['Privacy is a right.', 'Compliance is', 'a responsibility.'],
    size: { desktop: 140, phone: 44 },
  } satisfies DisplayTitle,
  body: 'So the pool asks for both. A withdrawal can stay private only if its deposit was approved.',
} as const

export const WHO = {
  n: '03',
  label: 'Who sees what',
  title: {
    lines: [
      ['It depends', 0],
      ['who is looking.', 1.4],
    ],
    phone: ['It depends', 'who is looking.'],
    size: { desktop: 140, phone: 48 },
  } satisfies DisplayTitle,
  lede: 'Here is what each party can learn from the prototype as it runs in October 2026, ourselves included.',
  cols: { who: 'Who', sees: 'Sees', hidden: 'Does not see' },
  rows: [
    {
      who: 'Anyone reading the chain',
      sees: "Every payment, with its sender and amount, and the one-time address it reached. Today, also the Port it went to, with that Port's name and the wallet that created it. Every deposit into the pool and every withdrawal out of it.",
      hidden:
        'Which deposit paid for which withdrawal. While the pool is this small, timing and amounts can still hint at a match.',
    },
    {
      who: 'Whoever pays you',
      sees: 'What they paid and the one-time address it went to. Today the Port is named in the link and on-chain, so they can also find other payments to it and the wallet that created it.',
      hidden: 'Your keys, or where the money goes once it leaves the pool privately.',
    },
    {
      who: 'Us, as operator today',
      sees: 'Every payment to your Ports, with payer, amount and memo, because we keep Port viewing keys on our server, encrypted. The reports we generate for you. The deposits you make in the app and the withdrawals our relayer sends, so we may be able to match the two by timing.',
      hidden:
        'Your spending keys. They are derived on your device and never sent to us, so we cannot spend from your addresses.',
    },
    {
      who: 'An auditor you choose',
      sees: 'The report you hand over: the period and Ports you chose, with the date, amount and other party of each payment in that scope.',
      hidden: 'Anything outside that report, beyond what the chain already shows.',
    },
  ],
  note: 'The on-chain Port record is the largest gap today. The plan for it is in the trust section.',
} as const

export const TRUST = {
  n: '04',
  label: 'Trust',
  title: {
    lines: [
      ['Where the', 0],
      ['trust sits.', 1.2],
    ],
    phone: ['Where the', 'trust sits.'],
    size: { desktop: 112, phone: 44 },
  } satisfies DisplayTitle,
  intro:
    'Some of this is enforced by contracts and cryptography. Some of it still rests on our team, and each of those parts has a plan next to it.',
  reviewed: 'Last reviewed October 2026',
  holds: {
    title: `Holds without trusting ${BRAND}`,
    qualifier:
      'While the pool contracts stay as deployed. Today we hold the key that can upgrade them.',
    items: [
      [
        'Your spending keys.',
        'They come from your own wallet signature, on your device, and never reach our servers.',
      ],
      [
        'Your proofs.',
        'Withdrawal proofs are built in your browser and checked by the pool contract on-chain.',
      ],
      ['The deposit rule.', 'The pool contract accepts only money that arrived through a Port.'],
      [
        'Your way out.',
        'Any deposit, approved or not, can be taken back by the address that made it. This runs through the contract alone, in public, with no service of ours.',
      ],
      [
        'The source.',
        'It is on GitHub under MIT and Apache-2.0, and a partner can run its own instance. One circuit is the exception, listed under Proving setup.',
      ],
    ] as const,
  },
  relies: {
    title: 'Relies on the team today',
    planLabel: 'Plan',
    items: [
      {
        label: 'Viewing keys',
        today:
          'Kept on our server, encrypted, so we can find your payments and build your reports.',
        plan: 'Viewing keys that stay on your device, with our server reduced to an index it cannot read.',
      },
      {
        label: 'The approved set',
        today:
          'We run the only approval service, called an Association Set Provider, and in this prototype it approves every deposit automatically.',
        plan: "Screening under each programme's own policy, with recorded decisions and more than one provider.",
      },
      {
        label: 'The relayer',
        today:
          'We run the only relayer. It cannot change where a withdrawal goes. If it stops, you can send the withdrawal to the contract yourself, but the address you withdraw to then pays its own gas, which can tie it back to you.',
        plan: 'Independent relayers, with a tested way to switch between them.',
      },
      {
        label: 'The admin key',
        today:
          'One admin address we control can upgrade the pool contracts, stop new deposits and bar an address from depositing.',
        plan: 'A multisig with a waiting period before any privileged change, then shared governance.',
      },
      {
        label: 'Port records',
        today:
          'Each payment records its Port on-chain, and each Port records its name and the wallet that created it.',
        plan: 'Hashed Port names.',
      },
      {
        label: 'Proving setup',
        today:
          'The verifier for merging deposits uses development setup parameters, and its circuit source is not yet public.',
        plan: 'Public circuit source and a public setup ceremony before any beneficiary funds.',
      },
      {
        label: 'Review',
        today: 'Our own contracts and circuits have had no independent review.',
        plan: 'An independent review before any use with beneficiary funds.',
      },
      {
        label: 'Use',
        today:
          'Almost all activity so far is our own testing, so there are few deposits to hide among.',
        plan: 'A privacy floor, measured and shown in the app, before sensitive use.',
      },
    ] satisfies readonly TrustItem[],
  },
  footnotes: [
    'Our hosted API, relayer and approval service are paused. The contracts on Mantle keep running, and taking a deposit back needs none of our services.',
    'Prototype software. Not for beneficiary funds.',
  ],
  link: {
    label: 'Full trust model in the litepaper',
    href: LINKS.litepaper,
    external: true,
  } satisfies SiteLink,
} as const

export const AUDIENCE = {
  n: '05',
  label: 'Who it is for',
  title: {
    lines: [
      ['For whoever is on', 0],
      ['the receiving end.', 1.0],
    ],
    phone: ['For whoever is on', 'the receiving end.'],
    size: { desktop: 112, phone: 40 },
  } satisfies DisplayTitle,
  items: [
    [
      'Programmes',
      `Aid and cash-transfer programmes that pay people on a public chain and should not have to publish a list of the people they help. Identity and eligibility stay in your own systems. ${BRAND} handles the payment on the chain and gives you a record to reconcile against. We can run it for you, or you can host your own.`,
    ],
    [
      'Organisations',
      'Teams that pay staff or suppliers on a public chain and would rather not put everyone they pay on public display.',
    ],
    [
      'People',
      'Anyone paid on a public chain who would rather a stranger could not add up their income, and who may still need to show it to a tax office.',
    ],
  ] as const,
  developers:
    'Developers: the contracts and the stealth address library are on GitHub to read and fork.',
} as const

export const CLOSE = {
  title: {
    lines: [
      ['Yours', 0],
      ['to tell.', 0.55],
    ],
    phone: ['Yours to tell.'],
    size: { desktop: 200, phone: 64 },
  } satisfies DisplayTitle,
  body: `If you run a programme that pays people on a public chain, write to us. We would like to test ${BRAND} with you, under your policy and reviewed by your auditors.`,
  primary: CONTACT,
  secondary: VIEW_SOURCE,
} as const

export const FOOTER = {
  lines: [
    `${BRAND} is an open-source privacy protocol for public blockchains, built in Colombia by Mateo Daza, Carlos Quintero and Fabio Anaya at ${ORG.name}.`,
    'Named after the San José, a galleon that sank off Cartagena in 1708. Its exact resting place is still kept private.',
    'Prototype software, not audited. Not for beneficiary funds until it has had an independent review.',
  ],
  cols: [
    {
      title: 'Protocol',
      links: [
        ...NAV.map((l) => ({ label: l.label, href: l.href })),
        { label: 'Litepaper', href: LINKS.litepaper, external: true },
      ],
    },
    {
      title: 'Source',
      links: [
        { label: 'GitHub', href: LINKS.github, external: true },
        {
          label: `Contracts on ${CHAIN.name}scan`,
          href: `${CHAIN.explorer}${REGISTRY?.address ?? ''}`,
          external: true,
        },
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
    'MIT and Apache-2.0',
    'No cookies or trackers on this site',
  ],
} as const
