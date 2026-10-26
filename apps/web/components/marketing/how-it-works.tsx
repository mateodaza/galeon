import { HOW } from '@/content/landing'
import { DisplayTitle } from './display-title'
import { SectionLabel } from './section-label'
import { StepDiagram, type DiagramKind } from './step-diagram'

const KINDS: readonly DiagramKind[] = ['receive', 'settle', 'prove']

/** Receive, settle, prove: three steps, each with its diagram. */
export function HowItWorks() {
  return (
    <section className="sect" id="how" aria-labelledby="how-h">
      <div className="wrap cols">
        <SectionLabel n={HOW.n} label={HOW.label} />
        <DisplayTitle id="how-h" title={HOW.title} />
        <p className="body how-lede">{HOW.lede}</p>
        <ol className="steps">
          {HOW.steps.map((s, i) => (
            <li className="step" key={s.n}>
              <div className="step-head">
                <span>{s.n}</span>
                <h3>{s.name}</h3>
              </div>
              <StepDiagram kind={KINDS[i]} />
              <p className="step-line">{s.line}</p>
              <p className="small">{s.text}</p>
              <p className="mono">{s.mono}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
