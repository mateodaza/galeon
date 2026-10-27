import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LEGACY_PATHS } from '@/components/legacy/legacy-links'

/** Origin story and the closing call to action of the previous About page. */
export function AboutClosing() {
  return (
    <>
      {/* Origin */}
      <section className="mt-16 rounded-xl border border-cyan-500/20 bg-cyan-950/30 p-8">
        <div className="flex items-start gap-4">
          <span className="text-4xl">🇨🇴</span>
          <div>
            <h2 className="text-xl font-bold text-cyan-400">Origin Story</h2>
            <p className="mt-2 text-cyan-100/70">
              Galeon was born at the Mantle Global Hackathon 2025, built by a team from Colombia—the
              same waters where the San José rests. We carry that spirit forward: building
              technology that protects what&apos;s yours, from a team proud of where we come from.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-16 text-center">
        <h2 className="text-2xl font-bold text-white">Ready to sail?</h2>
        <p className="mt-2 text-cyan-100/70">Privacy when you send. Privacy when you receive.</p>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button size="lg" asChild>
            <Link href="/setup">Get Started</Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            asChild
            className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            <Link href={LEGACY_PATHS.roadmap}>View Roadmap</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
