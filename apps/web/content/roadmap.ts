/**
 * Roadmap page copy: what the code does today, then the plan. It must agree
 * with the trust section on the landing (`TRUST` in `content/landing.ts`).
 * Each entry is a line, not a paragraph. No chain is named; the brand name
 * comes from `lib/site.ts`.
 */
import type { DisplayTitle } from '@/content/landing'
import { SITE_NAME } from '@/lib/site'

const BRAND = SITE_NAME

export const ROADMAP = {
  label: 'Roadmap',
  meta: {
    title: `${BRAND} roadmap`,
    description: `What ${BRAND} does today, and what comes next.`,
  },
  og: [
    ['Where it stands,', 0],
    ['and what comes next.', 0],
  ] as const,
  title: {
    lines: [
      ['Where it stands,', 0],
      ['and what comes next.', 0],
    ],
    phone: ['Where it stands,', 'and what comes next.'],
    size: { desktop: 124, phone: 39 },
  } satisfies DisplayTitle,
  lede: 'The code is public, so the progress is too.',
  shipped: {
    label: 'Built',
    title: {
      lines: [['What works.', 0]],
      phone: ['What works.'],
      size: { desktop: 124, phone: 44 },
    } satisfies DisplayTitle,
    items: [
      ['Ports', 'Each payment lands at a fresh EIP-5564 one-time address.'],
      [
        'The privacy pool',
        'Withdraw privately with a zero-knowledge proof, or take a deposit back in public.',
      ],
      ['Port-only deposits', 'Only money that came through a Port gets in.'],
      ['Merged deposits', 'Deposits add up, so one proof withdraws them.'],
      ['Proofs in the browser', 'Built on your device. Your spending keys never leave it.'],
      ['A relayer', 'Sends private withdrawals, so the address you withdraw to pays no gas.'],
      ['Reports', 'Tax summaries per Port and period, as PDF for the US or Colombia.'],
      ['A stealth address library', 'EIP-5564 in TypeScript, with an EIP-6538 registry.'],
    ] as const,
  },
  next: {
    label: 'Next',
    title: {
      lines: [['What comes next.', 0]],
      phone: ['What comes next.'],
      size: { desktop: 124, phone: 44 },
    } satisfies DisplayTitle,
    items: [
      {
        name: 'Native USDC',
        text: 'The contracts take ERC-20 already. Next, native USDC across the app, on a chain where proofs stay cheap.',
      },
      {
        name: 'A mobile-first app',
        text: 'Receive, deposit and withdraw, tuned for low-end Android phones.',
      },
      {
        name: 'Keys on your device',
        text: 'Viewing keys stay with you. Any server keeps only an index it cannot read.',
      },
      {
        name: 'Private Port names',
        text: 'Names stored as hashes, so the chain shows less about each Port.',
      },
      {
        name: 'More than one operator',
        text: "Screening under each deployment's own policy, with recorded decisions, and relayers run by more than one party.",
      },
      {
        name: 'Shared control',
        text: 'A multisig and a delay before any privileged change, then shared governance.',
      },
      {
        name: 'Open circuits, reviewed',
        text: 'Circuit source and a public setup ceremony, then an outside review with published findings.',
      },
      {
        name: 'Proof of source',
        text: 'Link chosen incoming payments to a withdrawal. Anyone can check it without your spending keys.',
      },
      {
        name: 'Disclosure as proofs',
        text: 'Prove a payment, or income under a threshold, without showing the rest.',
      },
    ],
    after: 'The order follows what the first deployments need.',
  },
} as const
