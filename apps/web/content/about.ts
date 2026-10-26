/**
 * About page copy. Same voice and rules as `content/landing.ts`: "you" is the
 * person being paid, "we" is the team, every sentence describes what the code
 * does today or is marked as intent. The brand name comes from `lib/site.ts`.
 */
import type { DisplayTitle, SiteLink } from '@/content/landing'
import { CHAIN, ORG, SITE_NAME } from '@/lib/site'

const BRAND = SITE_NAME

export const ABOUT = {
  label: 'About',
  meta: {
    title: `About ${BRAND}`,
    description: `What ${BRAND} is, why it is named after the San José, how its three layers fit together, and who builds it on Colombia's Caribbean coast.`,
  },
  og: [
    ['Named after a ship', 0],
    ['that kept its secret.', 0.5],
  ] as const,
  title: {
    lines: [
      ['Named after a ship', 0],
      ['that kept its secret.', 1.2],
    ],
    phone: ['Named after', 'a ship that kept', 'its secret.'],
    size: { desktop: 112, phone: 40 },
  } satisfies DisplayTitle,
  story: [
    'On 8 June 1708 the San José, flagship of the Spanish treasure fleet, went down off Cartagena in a battle with British warships. Where she lay stayed unknown for more than three centuries. Colombia announced the find in 2015, and the exact position is still kept private.',
    `A public blockchain works the other way round. Every payment is on display, and anyone who learns an address can read its history. ${BRAND} is being built so the person being paid decides who learns that record, and can still hand it over when a tax office or an auditor needs it.`,
    `Galeón is Spanish for galleon. ${BRAND} is built in Barranquilla and Cartagena, on the coast where the ship went down.`,
  ],
  what: {
    n: '01',
    label: 'What it is',
    title: {
      lines: [
        ['Three layers,', 0],
        ['used together or apart.', 0.9],
      ],
      phone: ['Three layers,', 'used together', 'or apart.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    lede: `${BRAND} is an open-source privacy protocol being developed to help people and organisations use public blockchains without unnecessarily exposing their financial activity, while letting them share relevant transaction information when needed. It is a protocol and a reference app, and we never hold your spending keys.`,
    layers: [
      {
        n: '01',
        name: 'Receive',
        text: 'A Port is a payment link backed by a stealth meta-address. Every payment to it lands at a fresh one-time address under EIP-5564, and only your keys can spend from it. Each Port has its own keys, so one leaked viewing key exposes only that Port.',
      },
      {
        n: '02',
        name: 'Settle',
        text: 'Money that arrived through a Port can go into a shared pool. A private withdrawal carries a zero-knowledge proof that its deposit is in the set an approval service has accepted, without saying which deposit. This is the model described in the Privacy Pools paper.',
      },
      {
        n: '03',
        name: 'Prove',
        text: 'When a tax office, an auditor or a donor asks for evidence, you make a report for the period and the Ports you choose, and send it yourself. Nothing is published. Reports follow US and Colombian tax formats today.',
      },
    ],
    after:
      'The layers are independent. A programme can use Ports alone, an organisation can run the pool with its own approval service, and reports work across both. What each layer still trusts us with is set out in the trust section and on the roadmap.',
    links: [
      { label: 'Where the trust sits', href: '/#trust' },
      { label: 'Roadmap', href: '/roadmap' },
    ] satisfies readonly SiteLink[],
  },
  team: {
    n: '02',
    label: 'Who builds it',
    title: {
      lines: [
        ['A small team on', 0],
        ['the Caribbean coast.', 1.0],
      ],
      phone: ['A small team', 'on the', 'Caribbean coast.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    lede: `${BRAND} is developed by its three co-founders under ${ORG.name}, a Colombian organisation that helps institutions and communities adopt open blockchain infrastructure. It began at the Mantle Global Hackathon in late 2025, where it won the real-world assets track.`,
    org: { label: ORG.name, href: ORG.url, external: true } satisfies SiteLink,
  },
  mark: {
    n: '03',
    label: 'The mark',
    title: {
      lines: [
        ['Five circles', 0],
        ['and two curves.', 0.8],
      ],
      phone: ['Five circles', 'and two curves.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    body: [
      'The crescent opens up and to the right. Two sails stand inside it, and the gap between them is the mast. A wave is cut into the lower horn.',
      'It is drawn on a 64-unit grid. Two circles make the moon, two more cut the wave, a fifth sets the line the sails stand on, and two curves give the sails their trailing edges. Below 64 px a simpler cut drops the wave, so the mark stays clear in a browser tab.',
    ],
    figure: `The ${BRAND} mark over its construction lines`,
  },
  contracts: {
    n: '04',
    label: 'On-chain',
    title: {
      lines: [['The contracts.', 0]],
      phone: ['The contracts.'],
      size: { desktop: 96, phone: 40 },
    } satisfies DisplayTitle,
    lede: `The prototype runs on ${CHAIN.name} mainnet. Each address links to its page on the explorer.`,
    groups: { Stealth: 'Receiving', Pool: 'Pool' },
  },
} as const
