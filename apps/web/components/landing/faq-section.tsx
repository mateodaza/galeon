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
    question: 'What are stealth addresses?',
    answer:
      'One-time payment destinations generated from a public meta-address. Each payment creates a unique address only you can spend from, breaking on-chain links to your identity.',
  },
  {
    question: 'Do payers need special wallets?',
    answer:
      'No. Payers use standard EVM transactions — any wallet works. The stealth address is generated client-side when they open your payment link.',
  },
  {
    question: 'Is this compliant with regulations?',
    answer:
      'Yes. On-chain receipts prove payment without revealing your address. You control what to disclose for compliance, accounting, or disputes.',
  },
  {
    question: 'Is my private key stored anywhere?',
    answer:
      'Never. Your spending key is derived on-demand from your wallet signature. Galeon only stores your public meta-address on-chain.',
  },
  {
    question: 'What chains are supported?',
    answer:
      'Built on Mantle L2 for low fees and fast confirmations. EIP-5564 works on any EVM chain, so expansion is straightforward.',
  },
  {
    question: 'How do I collect my funds?',
    answer:
      'Your viewing key scans the blockchain for payments. Once detected, derive the spending key for that stealth address and transfer funds to any wallet.',
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
