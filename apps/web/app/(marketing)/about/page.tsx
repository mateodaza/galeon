import type { Metadata } from 'next'
import { DisplayTitle } from '@/components/marketing/display-title'
import { MarkConstruction } from '@/components/marketing/mark-construction'
import { SectionLabel } from '@/components/marketing/section-label'
import { SiteLinkAnchor } from '@/components/marketing/site-link'
import { ABOUT } from '@/content/about'
import { pageMetadata } from '@/lib/page-metadata'
import { CHAIN, CONTRACTS, TEAM } from '@/lib/site'

export const metadata: Metadata = pageMetadata({
  title: 'About',
  shareTitle: ABOUT.meta.title,
  description: ABOUT.meta.description,
  path: '/about',
})

const { what, team, mark, contracts } = ABOUT

export default function AboutPage() {
  return (
    <>
      <section className="page-head" aria-labelledby="about-h">
        <div className="wrap cols">
          <SectionLabel label={ABOUT.label} />
          <DisplayTitle as="h1" id="about-h" title={ABOUT.title} />
          <div className="story">
            {ABOUT.story.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="sub" aria-labelledby="what-h">
        <div className="wrap cols">
          <SectionLabel n={what.n} label={what.label} />
          <DisplayTitle id="what-h" title={what.title} />
          <p className="body page-lede">{what.lede}</p>
          <ol className="aud">
            {what.layers.map((l) => (
              <li key={l.n}>
                <span className="n">{l.n}</span>
                <h3>{l.name}</h3>
                <p>{l.text}</p>
              </li>
            ))}
          </ol>
          <div className="devs after">
            <p>{what.after}</p>
            <p className="actions">
              {what.links.map((l) => (
                <SiteLinkAnchor key={l.href} className="link" link={l} icon="arrow" />
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="sub" aria-labelledby="team-h">
        <div className="wrap cols">
          <SectionLabel n={team.n} label={team.label} />
          <DisplayTitle id="team-h" title={team.title} />
          <p className="body page-lede">{team.lede}</p>
          <ul className="rows">
            {TEAM.map((person) => (
              <li className="row" key={person.name}>
                <h3>{person.name}</h3>
                <div className="r2">
                  <span className="tag">{person.role}</span>
                  <p>{person.bio}</p>
                </div>
                <p className="r3 row-links">
                  {'github' in person.links && (
                    <SiteLinkAnchor
                      className="link"
                      link={{ label: 'GitHub', href: person.links.github, external: true }}
                    />
                  )}
                  <SiteLinkAnchor
                    className="link"
                    link={{ label: 'LinkedIn', href: person.links.linkedin, external: true }}
                  />
                </p>
              </li>
            ))}
          </ul>
          <p className="team-org">
            <SiteLinkAnchor className="link" link={team.org} />
          </p>
        </div>
      </section>

      <section className="sub" aria-labelledby="mark-h">
        <div className="wrap cols mark-grid">
          <SectionLabel n={mark.n} label={mark.label} />
          <DisplayTitle id="mark-h" title={mark.title} />
          <div className="mark-copy">
            {mark.body.map((p) => (
              <p className="body" key={p}>
                {p}
              </p>
            ))}
          </div>
          <figure className="mark-figure">
            <MarkConstruction label={mark.figure} />
          </figure>
        </div>
      </section>

      <section className="sub" aria-labelledby="chain-h">
        <div className="wrap cols">
          <SectionLabel n={contracts.n} label={contracts.label} />
          <DisplayTitle id="chain-h" title={contracts.title} />
          <p className="body page-lede">{contracts.lede}</p>
          <div className="chain">
            {(['Stealth', 'Pool'] as const).map((group) => (
              <div key={group}>
                <h3>{contracts.groups[group]}</h3>
                <ul>
                  {CONTRACTS.filter((c) => c.group === group).map((c) => (
                    <li key={c.address}>
                      <span>{c.name}</span>
                      <a
                        className="mono"
                        href={`${CHAIN.explorer}${c.address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {c.address}
                        <span className="sr"> on {CHAIN.name}scan (opens in a new tab)</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
