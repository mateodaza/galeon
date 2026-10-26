import { CLOSE } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { MarkPlate } from './mark-plate'
import { SiteLinkAnchor } from './site-link'

/** The close: the mark again in paper lines on sea, and the one request we make. */
export function ClosingBand() {
  return (
    <section className="band band-sea on-dark closing" id="close" aria-labelledby="close-h">
      <div className="wrap cols close-grid">
        <div className="close-plate">
          <MarkPlate id="close-mark" />
        </div>
        <DisplayTitle id="close-h" className="close-title" title={CLOSE.title} />
        <div className="close-copy">
          <p className="body">{CLOSE.body}</p>
          <div className="actions">
            <SiteLinkAnchor className="btn" link={CLOSE.primary} />
            <SiteLinkAnchor className="link" link={CLOSE.secondary} />
          </div>
        </div>
      </div>
    </section>
  )
}
