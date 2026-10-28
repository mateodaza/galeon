import { WHO } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { keepWhole, Phrased } from './phrased'
import { SectionLabel } from './section-label'
import { TrustLedger } from './trust-ledger'
import { WhoRow } from './who-row'

/** Keys for the two columns: solid for what a party sees, lines for what stays withheld. */
const SEES = <i className="k k-solid" aria-hidden="true" />
const WITHHELD = <i className="k k-lines" aria-hidden="true" />

/**
 * What each party can learn, whoever runs the deployment included, then where
 * the trust sits. On phones each row is a drawer (who-row.tsx).
 */
export function WhoSeesWhat() {
  return (
    <section className="sect" id="who" aria-labelledby="who-h">
      <div className="wrap cols">
        <SectionLabel label={WHO.label} />
        <DisplayTitle id="who-h" title={WHO.title} />
        <p className="body who-lede">
          <Phrased text={WHO.lede} clauses />
        </p>
        <div className="who">
          <div role="table" aria-labelledby="who-h">
            <div className="who-head" role="row">
              <span className="c1" role="columnheader">
                {WHO.cols.who}
              </span>
              <span className="c2" role="columnheader">
                {SEES}
                {WHO.cols.sees}
              </span>
              <span className="c3" role="columnheader">
                {WITHHELD}
                {WHO.cols.hidden}
              </span>
            </div>
            {WHO.rows.map((r, i) => (
              <WhoRow
                key={r.who}
                who={r.who}
                sees={keepWhole(r.sees)}
                hidden={keepWhole(r.hidden)}
                cols={WHO.cols}
                startOpen={i === 0}
              />
            ))}
          </div>
        </div>
      </div>
      <TrustLedger />
    </section>
  )
}
