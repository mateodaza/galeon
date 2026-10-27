import { HOW } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { keepWhole, Phrased } from './phrased'
import { SectionLabel } from './section-label'
import { StepDiagram, type DiagramKind } from './step-diagram'

const KINDS: readonly DiagramKind[] = ['receive', 'settle', 'prove']

/** Receive, settle, prove: three levels, each a card led by its number, its technology and its diagram. */
export function HowItWorks() {
  return (
    <section className="sect" id="how" aria-labelledby="how-h">
      <div className="wrap cols">
        <SectionLabel label={HOW.label} />
        <DisplayTitle id="how-h" title={HOW.title} />
        <p className="body how-lede">
          <Phrased text={HOW.lede} />
        </p>
        <ol className="steps">
          {HOW.steps.map((s, i) => (
            <li className="step" key={s.n}>
              <div className="step-head">
                <span className="step-n" aria-hidden="true">
                  {s.n}
                </span>
                <h3>{s.name}</h3>
                <p className="step-tech">{keepWhole(s.mono)}</p>
              </div>
              <div className="step-fig">
                <StepDiagram kind={KINDS[i]} />
              </div>
              <p className="step-line">
                <Phrased text={s.line} clauses />
              </p>
              <p className="small">{keepWhole(s.text)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
