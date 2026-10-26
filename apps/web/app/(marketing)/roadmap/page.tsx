import type { Metadata } from 'next'
import { DisplayTitle } from '@/components/marketing/display-title'
import { SectionLabel } from '@/components/marketing/section-label'
import { SiteLinkAnchor } from '@/components/marketing/site-link'
import { ROADMAP } from '@/content/roadmap'
import { pageMetadata } from '@/lib/page-metadata'
import { LINKS } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'Roadmap',
  shareTitle: ROADMAP.meta.title,
  description: ROADMAP.meta.description,
  path: '/roadmap',
})

const { shipped, limits, next } = ROADMAP

export default function RoadmapPage() {
  return (
    <>
      <section className="page-head" aria-labelledby="roadmap-h">
        <div className="wrap cols">
          <SectionLabel label={ROADMAP.label} />
          <DisplayTitle as="h1" id="roadmap-h" title={ROADMAP.title} />
          <p className="body page-lede">{ROADMAP.lede}</p>
        </div>
        <div className="wrap">
          <div className="facts page-facts">
            <dl>
              {ROADMAP.status.map((f) => (
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
        </div>
      </section>

      <section className="sub" aria-labelledby="shipped-h">
        <div className="wrap cols">
          <SectionLabel n={shipped.n} label={shipped.label} />
          <DisplayTitle id="shipped-h" title={shipped.title} />
          <dl className="pairs">
            {shipped.items.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="sub" aria-labelledby="limits-h">
        <div className="wrap cols">
          <SectionLabel n={limits.n} label={limits.label} />
          <DisplayTitle id="limits-h" title={limits.title} />
          <ul className="rows">
            {limits.items.map((it) => (
              <li className="row" key={it.title}>
                <h3>{it.title}</h3>
                <div className="r2">
                  <span className="tag">{limits.cols.now}</span>
                  <p>{it.now}</p>
                  {'why' in it && <p className="why">{it.why}</p>}
                </div>
                <div className="r3">
                  <span className="tag tag-sea">{limits.cols.next}</span>
                  <p>{it.next}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sub" aria-labelledby="next-h">
        <div className="wrap cols">
          <SectionLabel n={next.n} label={next.label} />
          <DisplayTitle id="next-h" title={next.title} />
          <ol className="aud aud-grid">
            {next.items.map((it) => (
              <li key={it.n}>
                <span className="n">{it.n}</span>
                <h3>{it.name}</h3>
                <p>{it.text}</p>
              </li>
            ))}
          </ol>
          <div className="devs after">
            <p>{next.after}</p>
            <p className="actions">
              <SiteLinkAnchor
                className="link"
                link={{ label: 'The repository', href: LINKS.github, external: true }}
              />
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
