import { WHY } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { Phrased } from './phrased'
import { SectionLabel } from './section-label'

/** The problem, on a dark band: a public address reads as a public history. */
export function WhyBand() {
  return (
    <section className="band band-ink on-dark" id="why" aria-labelledby="why-h">
      <div className="wrap cols">
        <SectionLabel label={WHY.label} />
        <DisplayTitle id="why-h" title={WHY.title} />
        <p className="body why-a">
          <Phrased text={WHY.body} />
        </p>
      </div>
    </section>
  )
}
