import { AUDIENCE } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { SectionLabel } from './section-label'

/** Programmes, organisations, people: whoever is on the receiving end. */
export function Audiences() {
  return (
    <section className="sect" id="for" aria-labelledby="for-h">
      <div className="wrap cols">
        <SectionLabel n={AUDIENCE.n} label={AUDIENCE.label} />
        <DisplayTitle id="for-h" title={AUDIENCE.title} />
        <ul className="aud">
          {AUDIENCE.items.map(([name, text]) => (
            <li key={name}>
              <h3>{name}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ul>
        <p className="devs">{AUDIENCE.developers}</p>
      </div>
    </section>
  )
}
