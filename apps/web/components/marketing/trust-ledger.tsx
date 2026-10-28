import { TRUST } from '@/content/landing'
import { keepWhole, Phrased } from './phrased'
import { SiteLinkAnchor } from './site-link'

/**
 * Where the trust sits, under the who-sees-what table: what holds by design,
 * and what whoever runs a deployment decides, as two short lists, then the one
 * caveat and the litepaper's trust model for the detail. `#trust` lands here.
 */
export function TrustLedger() {
  return (
    <div className="wrap cols ledger" id="trust">
      <div className="col-a">
        <h3>
          <i aria-hidden="true" />
          {TRUST.holds.title}
        </h3>
        <ul>
          {TRUST.holds.items.map((item) => (
            <li key={item}>{keepWhole(item)}</li>
          ))}
        </ul>
      </div>
      <div className="col-b">
        <h3>
          <i aria-hidden="true" />
          {TRUST.operator.title}
        </h3>
        <ul>
          {TRUST.operator.items.map((item) => (
            <li key={item}>{keepWhole(item)}</li>
          ))}
        </ul>
      </div>
      <div className="ledger-foot">
        <p className="qual">
          <span>
            <Phrased text={TRUST.qualifier} />
          </span>
        </p>
        <p>
          <SiteLinkAnchor className="link" link={TRUST.link} />
        </p>
      </div>
    </div>
  )
}
