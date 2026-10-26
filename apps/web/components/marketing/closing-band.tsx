import { CLOSE } from '@/content/landing'
import { ClosingMark } from './closing-mark'
import { DisplayTitle } from './display-title'
import { Phrased } from './phrased'
import { MarkPlate } from './mark-plate'
import { SiteLinkAnchor } from './site-link'

/**
 * The close: the mark again, alive in sea-on-dark lines on the deep band, and
 * the one request we make. The engraving inks in when the band comes into view.
 */
export function ClosingBand() {
  return (
    <section className="band band-deep on-dark closing" id="close" aria-labelledby="close-h">
      <div className="wrap cols close-grid">
        <div className="close-plate">
          <ClosingMark>
            <MarkPlate id="close-mark" className="fallback" />
          </ClosingMark>
        </div>
        <DisplayTitle id="close-h" className="close-title" title={CLOSE.title} />
        <div className="close-copy">
          <p className="body">
            <Phrased text={CLOSE.body} clauses />
          </p>
          <div className="actions">
            <SiteLinkAnchor className="btn" link={CLOSE.primary} />
            <SiteLinkAnchor className="link" link={CLOSE.secondary} />
          </div>
        </div>
      </div>
    </section>
  )
}
