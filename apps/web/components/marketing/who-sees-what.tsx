import { WHO } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { keepWhole, Phrased } from './phrased'
import { SectionLabel } from './section-label'
import { TrustLedger } from './trust-ledger'

/** Keys for the two columns: solid for what a party sees, lines for what stays withheld. */
const SEES = <i className="k k-solid" aria-hidden="true" />
const WITHHELD = <i className="k k-lines" aria-hidden="true" />

/** What each party can learn, whoever runs the deployment included, then where the trust sits. */
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
            {WHO.rows.map((r) => (
              <div className="who-row" role="row" key={r.who}>
                <div className="c1" role="rowheader">
                  <h3>{r.who}</h3>
                </div>
                <div className="c2" role="cell">
                  <b aria-hidden="true">
                    {SEES}
                    {WHO.cols.sees}
                  </b>
                  <p>{keepWhole(r.sees)}</p>
                </div>
                <div className="c3" role="cell">
                  <b aria-hidden="true">
                    {WITHHELD}
                    {WHO.cols.hidden}
                  </b>
                  <p>{keepWhole(r.hidden)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <TrustLedger />
    </section>
  )
}
