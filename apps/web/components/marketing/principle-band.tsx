import { PRINCIPLE } from '@/content/landing'
import { DisplayTitle } from './display-title'

/** The creed, on a sea band. */
export function PrincipleBand() {
  return (
    <section className="band band-sea on-dark" id="principle" aria-labelledby="principle-h">
      <div className="wrap cols">
        <DisplayTitle id="principle-h" title={PRINCIPLE.title} />
        <div className="principle-copy">
          <p className="body">{PRINCIPLE.body}</p>
        </div>
      </div>
    </section>
  )
}
