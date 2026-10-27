import type { Metadata } from 'next'
import { DisplayTitle } from '@/components/marketing/display-title'
import { keepWhole, Phrased } from '@/components/marketing/phrased'
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

const { shipped, next } = ROADMAP

export default function RoadmapPage() {
  return (
    <>
      <section className="page-head" aria-labelledby="roadmap-h">
        <div className="wrap cols">
          <SectionLabel label={ROADMAP.label} />
          <DisplayTitle as="h1" id="roadmap-h" title={ROADMAP.title} />
          <p className="body page-lede">
            <Phrased text={ROADMAP.lede} />
          </p>
        </div>
      </section>

      <section className="sub" aria-labelledby="shipped-h">
        <div className="wrap cols">
          <SectionLabel label={shipped.label} />
          <DisplayTitle id="shipped-h" title={shipped.title} />
          <dl className="pairs">
            {shipped.items.map(([term, text]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{keepWhole(text)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="sub" aria-labelledby="next-h">
        <div className="wrap cols">
          <SectionLabel label={next.label} />
          <DisplayTitle id="next-h" title={next.title} />
          <ul className="aud aud-grid">
            {next.items.map((it) => (
              <li key={it.name}>
                <h3>{it.name}</h3>
                <p>{keepWhole(it.text)}</p>
              </li>
            ))}
          </ul>
          <div className="devs after">
            <p>
              <Phrased text={next.after} clauses />
            </p>
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
