import { FACTS } from '@/content/landing'

/** Four facts under the hero: code, standards, status, where it is made. */
export function FactsRow() {
  return (
    <section className="wrap" aria-label="Key facts">
      <div className="facts">
        <dl>
          {FACTS.map((f) => (
            <div key={f.term}>
              <dt>{f.term}</dt>
              <dd>
                <b>{f.value}</b>
                <span>{f.detail}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
