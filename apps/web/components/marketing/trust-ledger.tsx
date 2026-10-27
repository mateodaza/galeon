import { TRUST } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { keepWhole, Phrased } from './phrased'
import { SectionLabel } from './section-label'
import { SiteLinkAnchor } from './site-link'

/** Two short lists: what holds by design, and what whoever runs a deployment decides. */
export function TrustLedger() {
  return (
    <section className="sect" id="trust" aria-labelledby="trust-h">
      <div className="wrap cols">
        <SectionLabel label={TRUST.label} />
        <DisplayTitle id="trust-h" title={TRUST.title} />
        <div className="trust-intro">
          <p className="body">
            <Phrased text={TRUST.intro} clauses />
          </p>
        </div>
      </div>
      <div className="wrap cols ledger">
        <div className="col-a">
          <h3>
            <i aria-hidden="true" />
            {TRUST.holds.title}
          </h3>
          <ul>
            {TRUST.holds.items.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <p>{keepWhole(text)}</p>
              </li>
            ))}
          </ul>
          <p className="qual">{TRUST.holds.qualifier}</p>
        </div>
        <div className="col-b">
          <h3>
            <i aria-hidden="true" />
            {TRUST.operator.title}
          </h3>
          <ul>
            {TRUST.operator.items.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <p>{keepWhole(text)}</p>
              </li>
            ))}
          </ul>
          <div className="foot-notes">
            <p>
              <SiteLinkAnchor className="link" link={TRUST.link} />
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
