import { CLOSE } from '@/content/landing'
import { ClosingMark } from './closing-mark'
import { DisplayTitle } from './display-title'
import { GlitchLayer } from './glitch-layer'
import { Phrased } from './phrased'
import { MarkPlate } from './mark-plate'
import { SiteLinkAnchor } from './site-link'

/**
 * The close: the mark again, still, in sea-on-dark lines on the deep band, and
 * the one request we make. A glitch hides parts of the section now and then,
 * and wherever a mouse rests on it.
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
      <GlitchLayer lines=".close-title .ln, .close-copy .body" blocks=".close-plate" ambient />
    </section>
  )
}
