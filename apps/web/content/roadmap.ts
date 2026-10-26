/**
 * Roadmap page copy. It must agree with the trust section on the landing
 * (`TRUST` in `content/landing.ts`): the same gaps, the same plans. Dated by
 * `STATUS.asOf` in `lib/site.ts`.
 */
import type { DisplayTitle } from '@/content/landing'
import { SITE_NAME, STATUS } from '@/lib/site'

const BRAND = SITE_NAME

export interface Limit {
  readonly title: string
  readonly now: string
  readonly why?: string
  readonly next: string
}

export const ROADMAP = {
  label: `Roadmap · ${STATUS.asOf}`,
  meta: {
    title: `${BRAND} roadmap`,
    description: `What ${BRAND} does today, what still depends on our team, and what has to be true before it carries funds that matter.`,
  },
  og: [
    ['Where it stands,', 0],
    ['and what comes next.', 0.5],
  ] as const,
  title: {
    lines: [
      ['Where it stands,', 0],
      ['and what comes next.', 1.0],
    ],
    phone: ['Where it stands,', 'and what', 'comes next.'],
    size: { desktop: 112, phone: 40 },
  } satisfies DisplayTitle,
  lede: `This page is deliberately plain. It lists what works today and what still depends on our team, then what has to be true before ${BRAND} carries funds that matter.`,
  status: [
    { term: 'Status', value: STATUS.label, detail: STATUS.detail },
    {
      term: 'Review',
      value: 'Not audited',
      detail: 'No independent review of our own contracts and circuits yet.',
    },
    {
      term: 'Hosted services',
      value: 'Paused',
      detail: 'The contracts on Mantle keep running without them.',
    },
    {
      term: 'Next',
      value: 'Base',
      detail: 'With native USDC, after security, mobile and operational checks.',
    },
  ],
  shipped: {
    n: '01',
    label: 'Works today',
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
        'It submits private withdrawals, so the address you withdraw to does not pay its own gas.',
      ],
      [
        'Reports',
        'Reports for the Ports and period you choose, exported as PDF in US and Colombian tax formats.',
      ],
    ] as const,
  },
  limits: {
    n: '02',
    label: 'Known gaps',
    title: {
      lines: [
        ['What still', 0],
        ['depends on us.', 0.9],
      ],
      phone: ['What still', 'depends on us.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    cols: { gap: 'Gap', now: 'Today', why: 'Why', next: 'Plan' },
    items: [
      {
        title: 'The relayer',
        now: 'We run the only relayer. If it stops, you can send a withdrawal to the contract yourself, but the address you withdraw to then pays its own gas, which can tie it back to you.',
        why: 'One relayer was enough to prove the flow in a prototype.',
        next: 'Independent relayers, with a tested way to switch between them.',
      },
      {
        title: 'The approved set',
        now: 'We run the only approval service, called an Association Set Provider, and in this prototype it approves every deposit automatically.',
        why: 'A single operator is the simplest setup to reason about while the pool is small.',
        next: "Screening under each programme's own policy, with recorded decisions, a documented handover and more than one provider.",
      },
      {
        title: 'Viewing keys',
        now: 'Kept on our server, encrypted, so it can find your payments and build your reports.',
        why: 'Scanning every announcement on a phone was too slow for the prototype.',
        next: 'Viewing keys that stay on your device, with our server reduced to an index it cannot read.',
      },
      {
        title: 'Port records',
        now: 'Each payment records its Port on-chain, and each Port records its name and the wallet that created it.',
        next: 'Hashed Port names.',
      },
      {
        title: 'The admin key',
        now: 'One admin address we control can upgrade the pool contracts, stop new deposits and bar an address from depositing.',
        why: 'Upgrades let us swap verifiers as the circuits changed.',
        next: 'A multisig with a waiting period before any privileged change, then shared governance.',
      },
      {
        title: 'Proving setup',
        now: 'The verifier for merging deposits uses development setup parameters, and its circuit source is not yet public.',
        why: 'A public ceremony is a project of its own, and it was out of scope for a prototype.',
        next: 'Public circuit source and a public setup ceremony before any beneficiary funds.',
      },
      {
        title: 'Review',
        now: 'Our own contracts and circuits have had no independent review.',
        next: 'An independent review before any use with beneficiary funds, with the findings published.',
      },
      {
        title: 'Use',
        now: 'Almost all activity so far is our own testing, so there are few deposits to hide among.',
        why: 'Privacy grows with the number of people in the pool, and there have been few.',
        next: 'A privacy floor, measured and shown in the app, before sensitive use.',
      },
    ] satisfies readonly Limit[],
  },
  next: {
    n: '03',
    label: 'Next',
    title: {
      lines: [['What comes next.', 0]],
      phone: ['What comes', 'next.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    items: [
      {
        n: '01',
        name: 'Base with native USDC',
        text: 'The contracts already support ERC-20 tokens. Moving from Mantle to Base is integration work on the whole application, released only after security, mobile and operational checks.',
      },
      {
        n: '02',
        name: 'A mobile-first reference app',
        text: 'Proofs and the receive, deposit and withdraw flow tested on low-end Android phones, with targets for proof time and completion, before anyone outside the team is asked to use it.',
      },
      {
        n: '03',
        name: 'Independent review',
        text: 'Contracts, circuits and the proving setup reviewed by people who did not write them, with the findings addressed and published before limited real use.',
      },
      {
        n: '04',
        name: 'Proof of source',
        text: 'A package you approve that links selected incoming payments to a completed withdrawal, which a third party can check without your spending keys. Whether an off-ramp accepts it is their decision.',
      },
      {
        n: '05',
        name: 'Operators that are not us',
        text: 'Recorded and auditable approval decisions, the software and runbooks for another organisation to run the approval service, and relayers run by others.',
      },
      {
        n: '06',
        name: 'Disclosure as proofs',
        text: 'Cryptographic statements in place of exported PDFs: prove that a payment happened, or that income in a period stayed under a threshold, without showing the rest.',
      },
    ],
    after:
      'The order follows funding and partner readiness rather than dates. Progress is public in the repository.',
  },
} as const
