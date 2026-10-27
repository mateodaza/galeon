'use client'

import { useEffect, useRef } from 'react'
import { NAV_COPY } from '@/content/landing'
import { SiteLinkAnchor } from './site-link'

/**
 * The phone and tablet menu. It is a <details> element, so it opens and
 * closes without JavaScript; the script only closes it after a link is
 * followed, on Escape, or on a click outside. The theme control stays in
 * the bar beside it.
 */
export function SiteMenu() {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const menu = ref.current
    if (!menu) return
    const close = () => {
      menu.open = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menu.open) {
        close()
        menu.querySelector('summary')?.focus()
      }
    }
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (!menu.contains(target) || (target as Element).closest?.('.menu-panel a')) close()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <details className="menu" ref={ref}>
      <summary>
        <span className="when-closed">{NAV_COPY.menu}</span>
        <span className="when-open">{NAV_COPY.close}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
          <path d="M2 7h16M2 13h16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </summary>
      <nav className="menu-panel" aria-label="Menu">
        <ul>
          {NAV_COPY.links.map((l) => (
            <li key={l.href}>
              <SiteLinkAnchor link={l} iconApart />
            </li>
          ))}
          {NAV_COPY.tools.map((l) => (
            <li key={l.href}>
              <SiteLinkAnchor link={l} iconApart />
            </li>
          ))}
        </ul>
      </nav>
    </details>
  )
}
