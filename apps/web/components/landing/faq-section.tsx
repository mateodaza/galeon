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
    question: 'How does receiving privately work?',
    answer:
      'Create a Port (payment link) and share it. Each payment generates a unique stealth address — only you can find and spend from it. Ports are permanent and can be deactivated when no longer needed.',
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
      'Generate a Shipwreck report to prove specific transactions without exposing your full history. Show exactly what you need for audits, taxes, or disputes — nothing more.',
  },
  {
    question: 'Do payers need special wallets?',
    answer:
      'No. Payers use any standard wallet. The stealth address is generated automatically when they open your payment link.',
  },
  {
    question: 'Is my private key stored anywhere?',
    answer:
      "Your spending key is derived from your wallet signature and stored only in your browser's local storage — never sent to servers. Galeon never transmits your private keys.",
  },
  {
    question: 'Why Mantle?',
    answer:
      'Privacy on Ethereum mainnet can cost $50+ per transaction. On Mantle, costs are significantly lower — typically cents. We believe privacy should be accessible to everyone, not just whales.',
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
