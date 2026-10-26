import type { Metadata } from 'next'
import { Audiences } from '@/components/marketing/audiences'
import { ClosingBand } from '@/components/marketing/closing-band'
import { FactsRow } from '@/components/marketing/facts-row'
import { Hero } from '@/components/marketing/hero'
import { HowItWorks } from '@/components/marketing/how-it-works'
import { PrincipleBand } from '@/components/marketing/principle-band'
import { TrustLedger } from '@/components/marketing/trust-ledger'
import { WhoSeesWhat } from '@/components/marketing/who-sees-what'
import { WhyBand } from '@/components/marketing/why-band'

/** Title, description and social cards for `/` come from the root layout and `app/opengraph-image.tsx`. */
export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

/** The landing. Static and server-rendered; it reads in full without JavaScript. */
export default function Home() {
  return (
    <>
      <Hero />
      <FactsRow />
      <WhyBand />
      <HowItWorks />
      <PrincipleBand />
      <WhoSeesWhat />
      <TrustLedger />
      <Audiences />
      <ClosingBand />
    </>
  )
}
