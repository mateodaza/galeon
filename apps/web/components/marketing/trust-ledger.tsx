import { TRUST } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { SectionLabel } from './section-label'
import { SiteLinkAnchor } from './site-link'

/** What holds without trusting the team, and what still rests on it, with a plan beside each. */
export function TrustLedger() {
  return (
    <section className="sect" id="trust" aria-labelledby="trust-h">
      <div className="wrap cols">
        <SectionLabel n={TRUST.n} label={TRUST.label} />
        <DisplayTitle id="trust-h" title={TRUST.title} />
        <div className="trust-intro">
          <p className="body">{TRUST.intro}</p>
          <span className="reviewed">{TRUST.reviewed}</span>
        </div>
      </div>
      <div className="wrap cols ledger">
        <div className="col-a">
          <h3>
            <i aria-hidden="true" />
            {TRUST.holds.title}
          </h3>
          <p className="qual">{TRUST.holds.qualifier}</p>
          <ul>
            {TRUST.holds.items.map(([title, text]) => (
              <li key={title}>
                <strong>{title}</strong>
                <p>{text}</p>
              </li>
            ))}
          </ul>
          <div className="foot-notes">
            {TRUST.footnotes.map((t) => (
              <p key={t}>{t}</p>
            ))}
            <p>
              <SiteLinkAnchor className="link" link={TRUST.link} />
            </p>
          </div>
        </div>
        <div className="col-b">
          <h3>
            <i aria-hidden="true" />
            {TRUST.relies.title}
          </h3>
          <ul>
            {TRUST.relies.items.map((it) => (
              <li key={it.label}>
                <strong>{it.label}</strong>
                <p>{it.today}</p>
                <p className="next">
                  <b>{TRUST.relies.planLabel}</b>
                  <span>{it.plan}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
