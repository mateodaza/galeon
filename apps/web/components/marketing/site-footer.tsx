import Link from 'next/link'
import { Lockup } from '@/components/brand/lockup'
import { FOOTER, NAV_COPY } from '@/content/landing'
import { SiteLinkAnchor } from './site-link'

/** Who builds it, the name's story, the honest status, and every link once more. */
export function SiteFooter() {
  return (
    <footer>
      <div className="wrap cols">
        <div className="f-brand">
          <Link className="brand" href="/" aria-label={NAV_COPY.home}>
            <Lockup title="" />
          </Link>
          <div className="f-lines">
            {FOOTER.lines.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        </div>
        {FOOTER.cols.map((col, i) => (
          <nav key={col.title} className={`f-col f${i + 1}`} aria-label={col.title}>
            <h2>{col.title}</h2>
            <ul>
              {col.links.map((l) => (
                <li key={l.label}>
                  <SiteLinkAnchor link={l} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
        <div className="f-base">
          <ul>
            {FOOTER.base.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  )
}
