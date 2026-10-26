import Link from 'next/link'
import { Lockup } from '@/components/brand/lockup'
import { NAV_COPY } from '@/content/landing'
import { SiteLinkAnchor } from './site-link'
import { SiteMenu } from './site-menu'

/** Sticky paper bar: lockup, section links, litepaper and source; a menu below 900 px. */
export function SiteNav() {
  return (
    <header className="nav">
      <div className="wrap cols">
        <Link className="brand" href="/" aria-label={NAV_COPY.home}>
          <Lockup title="" />
        </Link>
        <nav className="nav-sections" aria-label="Sections">
          <ul className="nav-links">
            {NAV_COPY.links.map((l) => (
              <li key={l.href}>
                <SiteLinkAnchor link={l} />
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-tools">
          {NAV_COPY.tools.map((l) => (
            <SiteLinkAnchor key={l.href} className="nt" link={l} />
          ))}
          <SiteMenu />
        </div>
      </div>
    </header>
  )
}
