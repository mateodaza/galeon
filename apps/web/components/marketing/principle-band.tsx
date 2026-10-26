import { PRINCIPLE } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { Phrased } from './phrased'

/** The creed, on the deep band: dark, with sea on dark as its accent. */
export function PrincipleBand() {
  return (
    <section className="band band-deep on-dark" id="principle" aria-labelledby="principle-h">
      <div className="wrap cols">
        <DisplayTitle id="principle-h" title={PRINCIPLE.title} />
        <div className="principle-copy">
          <p className="body">
            <Phrased text={PRINCIPLE.body} />
          </p>
        </div>
      </div>
    </section>
  )
}
