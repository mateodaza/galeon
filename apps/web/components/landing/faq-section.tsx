'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { m, AnimatePresence } from 'motion/react'
import { useAnimationsEnabled } from '@/lib/animations'

interface FaqItem {
  question: string
  answer: string
}

const faqItems: FaqItem[] = [
  {
    question: 'Who is Galeon for?',
    answer:
      'Freelancers accepting client payments, creators receiving tips or subscriptions, businesses handling invoices, anyone receiving donations — anyone who needs to get paid on-chain without exposing their full financial history.',
  },
  {
    question: 'What is a Port?',
    answer:
      'A Port is a reusable payment link tied to your wallet. Share it with clients, put it on your invoice, or post it publicly — each payment automatically generates a unique stealth address that only you can access.',
  },
  {
    question: 'How does receiving privately work?',
    answer:
      'When someone pays your Port, Galeon generates a fresh stealth address for that payment. Only you can derive the private key to collect those funds. Ports are permanent — deactivation is planned for a future release.',
  },
  {
    question: 'How does sending privately work?',
    answer:
      'Deposit funds to the Privacy Pool, then withdraw to any address using a ZK proof. The proof cryptographically breaks the link between your deposit and withdrawal — no one can trace where the money went.',
  },
  {
    question: 'Why do I need both stealth addresses AND Privacy Pool?',
    answer:
      'Stealth addresses hide who received a payment (receiving privacy). But when you spend those funds, the trail continues. The Privacy Pool breaks that forward trail — hiding what you do with the money (spending privacy). You need both for complete financial privacy.',
  },
  {
    question: 'What about compliance and taxes?',
    answer:
      'Galeon is compliance-first. Generate Shipwreck reports to prove income, ownership, or transaction history for audits, taxes, or disputes — revealing only what you choose. Privacy and compliance, not privacy vs compliance.',
  },
  {
    question: 'Do payers need special wallets?',
    answer:
      'No. Payers use any standard wallet. The stealth address is generated automatically when they open your payment link.',
  },
  {
    question: 'How long do withdrawals take?',
    answer:
      'Proof generation takes 30-60 seconds depending on your device — it runs in your browser. Once submitted, the transaction typically confirms within a minute on Mantle.',
  },
  {
    question: 'Is my private key stored anywhere?',
    answer:
      "Your spending key is derived from your wallet signature and stored in your browser's local storage for convenience — never sent to servers. If you clear browser data, reconnect your wallet and sign again to recover access. Your funds are always recoverable from your wallet signature.",
  },
  {
    question: 'Why Mantle?',
    answer:
      'Privacy on Ethereum mainnet can cost $50+ per transaction. On Mantle, costs are significantly lower — typically cents. We believe privacy should be accessible to everyone, not just whales.',
  },
  {
    question: 'Is Galeon audited?',
    answer:
      "Galeon itself is an unaudited hackathon MVP. We build on audited upstream libraries: 0xBow's Privacy Pools protocol and @noble cryptographic libraries (secp256k1, hashing). A full security audit of Galeon is planned before mainnet launch.",
  },
]

/**
 * Clean accordion FAQ with elegant typography and minimal styling.
 * No cards - just clean dividers and smooth animations.
 */
export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const animationsEnabled = useAnimationsEnabled()

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="px-6 py-24">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-2 inline-block rounded-full border border-white/20 bg-slate-700/50 px-4 py-1.5 text-sm font-medium uppercase tracking-wider text-white/80 backdrop-blur-xl">
            Questions
          </p>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl">
            Everything you need to know
          </h2>
        </div>

        {/* Accordion */}
        <div className="space-y-0 rounded-2xl border border-white/20 bg-slate-900/50 px-6 shadow-lg shadow-black/10 backdrop-blur-xl">
          {faqItems.map((item, index) => {
            const isOpen = openIndex === index
            const isFirst = index === 0

            return (
              <div key={index} className={`${isFirst ? '' : 'border-t border-slate-700'}`}>
                <button
                  onClick={() => toggleItem(index)}
                  className="group flex w-full items-center justify-between py-6 text-left"
                >
                  <span
                    className={`text-lg font-medium transition-colors ${
                      isOpen ? 'text-cyan-300' : 'text-cyan-100/70 group-hover:text-cyan-200'
                    }`}
                  >
                    {item.question}
                  </span>
                  <ChevronRight
                    className={`h-5 w-5 shrink-0 text-cyan-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>

                {animationsEnabled ? (
                  <AnimatePresence>
                    {isOpen && (
                      <m.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="overflow-hidden"
                      >
                        <p className="pb-6 leading-relaxed text-cyan-100/80">{item.answer}</p>
                      </m.div>
                    )}
                  </AnimatePresence>
                ) : (
                  isOpen && <p className="pb-6 leading-relaxed text-cyan-100/80">{item.answer}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
