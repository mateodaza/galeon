import { WHY } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { SectionLabel } from './section-label'

/** The problem, on an ink band: a public address reads as a public history. */
export function WhyBand() {
  return (
    <section className="band band-ink on-dark" id="why" aria-labelledby="why-h">
      <div className="wrap cols">
        <SectionLabel n={WHY.n} label={WHY.label} />
        <DisplayTitle id="why-h" title={WHY.title} />
        <p className="body why-a">{WHY.body[0]}</p>
        <p className="body why-b">{WHY.body[1]}</p>
      </div>
    </section>
  )
}
