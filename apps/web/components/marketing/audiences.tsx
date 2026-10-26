import { AUDIENCE } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { keepWhole, Phrased } from './phrased'
import { SectionLabel } from './section-label'

/** Programmes, organisations, people: anyone on the receiving end. */
export function Audiences() {
  return (
    <section className="sect" id="for" aria-labelledby="for-h">
      <div className="wrap cols">
        <SectionLabel label={AUDIENCE.label} />
        <DisplayTitle id="for-h" title={AUDIENCE.title} />
        <ul className="aud">
          {AUDIENCE.items.map(([name, text]) => (
            <li key={name}>
              <h3>{name}</h3>
              <p>{keepWhole(text)}</p>
            </li>
          ))}
        </ul>
        <p className="devs">
          <Phrased text={AUDIENCE.developers} />
        </p>
      </div>
    </section>
  )
}
