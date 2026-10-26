/**
 * Roadmap page copy: what the code does today, then the plan. It must agree
 * with the trust section on the landing (`TRUST` in `content/landing.ts`).
 * No chain is named; the brand name comes from `lib/site.ts`.
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
    size: { desktop: 112, phone: 38 },
  } satisfies DisplayTitle,
  lede: 'The code is on GitHub, so progress is public too.',
  shipped: {
    label: 'Built',
    title: {
      lines: [['What works.', 0]],
      phone: ['What works.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    items: [
      [
        'Ports',
        'Payment links that land each payment at a fresh EIP-5564 one-time address, with separate keys for every Port.',
      ],
      [
        'The privacy pool',
        'Deposit, withdraw privately with a zero-knowledge proof, or take a deposit back in public through the contract alone.',
      ],
      ['Port-only deposits', 'The pool accepts only money that arrived through a Port.'],
      ['Merged deposits', 'Deposits add up to one balance, so a withdrawal needs a single proof.'],
      [
        'Proofs in the browser',
        'Withdrawal proofs are built on your device, and your spending keys never leave it.',
      ],
      [
        'A relayer',
        'It sends private withdrawals, so the address you withdraw to does not pay its own gas.',
      ],
      ['Reports', 'Tax summaries for a Port and period, exported as PDF for the US or Colombia.'],
      [
        'A stealth address library',
        'EIP-5564 in TypeScript, with an EIP-6538 registry contract, for anyone to build on.',
      ],
    ] as const,
  },
  next: {
    label: 'Next',
    title: {
      lines: [['What comes next.', 0]],
      phone: ['What comes next.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    items: [
      {
        name: 'Native USDC',
        text: 'The contracts already support ERC-20 tokens. Next comes native USDC across the whole app, on a chain where proofs stay cheap to verify.',
      },
      {
        name: 'A mobile-first app',
        text: 'The receive, deposit and withdraw flow tuned for low-end Android phones, with targets for proof time.',
      },
      {
        name: 'Keys on your device',
        text: 'Viewing keys that stay on your device, with any server reduced to an index it cannot read.',
      },
      {
        name: 'Private Port names',
        text: 'Port names stored as hashes, so the chain shows less about each Port.',
      },
      {
        name: 'More than one operator',
        text: "Screening under each deployment's own policy, with recorded decisions, and relayers run by more than one party.",
      },
      {
        name: 'Shared control',
        text: 'A multisig with a delay before any privileged change, then shared governance.',
      },
      {
        name: 'Open circuits, reviewed',
        text: "Every circuit's source published, with a public setup ceremony. Then contracts, circuits and setup reviewed by people who did not write them, with published findings.",
      },
      {
        name: 'Proof of source',
        text: 'A package you approve that links selected incoming payments to a withdrawal. A third party can check it without your spending keys.',
      },
      {
        name: 'Disclosure as proofs',
        text: 'Prove that a payment happened, or that income in a period stayed under a threshold, without showing the rest.',
      },
    ],
    after: 'The order follows what the first deployments need.',
  },
} as const
