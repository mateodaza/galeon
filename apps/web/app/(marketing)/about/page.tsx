import type { Metadata } from 'next'
import { DisplayTitle } from '@/components/marketing/display-title'
import { keepWhole, Phrased } from '@/components/marketing/phrased'
import { SectionLabel } from '@/components/marketing/section-label'
import { SiteLinkAnchor } from '@/components/marketing/site-link'
import { ABOUT } from '@/content/about'
import { pageMetadata } from '@/lib/page-metadata'

export const metadata: Metadata = pageMetadata({
  title: 'About',
  shareTitle: ABOUT.meta.title,
  description: ABOUT.meta.description,
  path: '/about',
})

const { what, open } = ABOUT

export default function AboutPage() {
  return (
    <>
      <section className="page-head" aria-labelledby="about-h">
        <div className="wrap cols">
          <SectionLabel label={ABOUT.label} />
          <DisplayTitle as="h1" id="about-h" title={ABOUT.title} />
          <div className="story">
            {ABOUT.intro.map((p) => (
              <p key={p}>
                <Phrased text={p} clauses />
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="sub" aria-labelledby="what-h">
        <div className="wrap cols">
          <SectionLabel label={what.label} />
          <DisplayTitle id="what-h" title={what.title} />
          <p className="body page-lede">
            <Phrased text={what.lede} clauses />
          </p>
          <ol className="aud">
            {what.layers.map((l) => (
              <li key={l.n}>
                <span className="n">{l.n}</span>
                <h3>{l.name}</h3>
                <p>{keepWhole(l.text)}</p>
              </li>
            ))}
          </ol>
          <div className="devs after">
            <p>
              <Phrased text={what.after} clauses />
            </p>
            <p className="actions">
              {what.links.map((l) => (
                <SiteLinkAnchor key={l.href} className="link" link={l} icon="arrow" />
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="sub" aria-labelledby="open-h">
        <div className="wrap cols">
          <SectionLabel label={open.label} />
          <DisplayTitle id="open-h" title={open.title} />
          <div className="open-copy">
            <p className="body">
              <Phrased text={open.body} />
            </p>
            <p className="actions">
              {open.links.map((l) => (
                <SiteLinkAnchor key={l.href} className="link" link={l} />
              ))}
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
