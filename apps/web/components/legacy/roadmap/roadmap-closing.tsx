import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** Closing call to action of the previous Roadmap page. */
export function RoadmapClosing() {
  return (
    <section className="mt-16 text-center">
      <h2 className="text-2xl font-bold text-white">Join the Journey</h2>
      <p className="mt-2 text-cyan-100/70">
        We&apos;re building privacy infrastructure for the long term.
      </p>
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        <Button size="lg" asChild>
          <Link href="/setup">Try Galeon</Link>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          asChild
          className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <a
            href="https://github.com/galeon-privacy/galeon"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Source
          </a>
        </Button>
        <Button
          variant="ghost"
          size="lg"
          asChild
          className="border border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
        >
          <Link href="/covenant">Our Covenant</Link>
        </Button>
      </div>
    </section>
  )
}
