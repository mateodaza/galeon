/**
 * FAQ copy. Rendered on the landing page and mirrored into FAQPage JSON-LD,
 * so the two never drift apart.
 */
export interface FaqItem {
  question: string
  answer: string
}

export const FAQ: FaqItem[] = [
  {
    question: 'Who is Galeon for?',
    answer:
      'People and organisations that settle on public blockchains and do not want their whole financial history exposed to anyone with a block explorer. That includes humanitarian programmes paying beneficiaries, organisations paying staff and vendors, and individuals receiving income. Galeon is infrastructure: we can operate it, or a partner can host their own instance.',
  },
  {
    question: 'What is a Port?',
    answer:
      'A Port is a named payment endpoint with its own key pair, published as a stealth meta-address under EIP-6538. You share a link. Every payment to it lands at a fresh one-time address that only you can detect and spend from. Compromising one Port’s viewing key reveals nothing about your other Ports.',
  },
  {
    question: 'Is this a mixer?',
    answer:
      'No. Withdrawing privately from the pool requires a zero-knowledge proof that your deposit belongs to an approved set maintained by an Association Set Provider. A deposit that is never approved can only leave through a public exit back to the original depositor. This is the allowlist model from the Privacy Pools paper, which is the opposite of anything-goes anonymity.',
  },
  {
    question: 'What does “compliant” mean here?',
    answer:
      'Two things. At the system level, the pool only releases funds privately when their deposit has been approved by the ASP, and every approval root can be published for audit. At the user level, you can produce a report for a specific Port and period that shows income and counterparties to a tax authority, auditor or donor, without exposing anything else.',
  },
  {
    question: 'Can Galeon see my payments?',
    answer:
      'Partly, today. Port viewing keys are stored server-side, encrypted, so the operator can see which payments arrived at which Port. Spending keys never leave your device, so the operator cannot move funds, and withdrawal proofs are generated in your browser. Moving viewing keys fully client-side is on the roadmap.',
  },
  {
    question: 'Do payers need a special wallet?',
    answer:
      'No. Any standard wallet works. The one-time address is derived when the payer opens your link, and from their side it is an ordinary transfer.',
  },
  {
    question: 'Can I get my funds out if Galeon disappears?',
    answer:
      'Yes. Your keys derive from your wallet signature, not from anything we store. Pool withdrawals can be submitted directly to the contract without our relayer, and ragequit returns a deposit to its depositor. Both are enforced by the contracts, so they work with no Galeon service running.',
  },
  {
    question: 'How strong is the privacy?',
    answer:
      'It depends on how many others are in the pool and on your own habits. A withdrawal hides which deposit it came from only among the approved deposits that exist, and timing or amount patterns can still leak information. The app shows pool activity so you can judge, and the litepaper lists the current limitations. We do not promise anonymity.',
  },
  {
    question: 'Which chains does it run on?',
    answer:
      'The prototype runs on Mantle mainnet, where verifying a zero-knowledge proof costs cents rather than tens of dollars. The contracts are standard Solidity, and the next planned deployment is Base with native USDC. The protocol is not tied to a single chain.',
  },
  {
    question: 'Has Galeon been audited?',
    answer:
      'Not yet. Galeon is a prototype. It builds on audited components, including 0xbow’s Privacy Pools contracts and circuits and the noble cryptography libraries, but Galeon’s own contracts, circuits and proving setup have not had an independent review. That review is planned before any use with real beneficiary funds.',
  },
  {
    question: 'Is it open source?',
    answer:
      'Yes. The application code is MIT licensed. The pool contracts and SDK, which include code from 0xbow, are Apache-2.0. Everything is public on GitHub, including the litepaper.',
  },
]
