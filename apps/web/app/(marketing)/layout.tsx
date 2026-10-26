import type { Viewport } from 'next'
import localFont from 'next/font/local'
import { Fragment_Mono } from 'next/font/google'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteNav } from '@/components/marketing/site-nav'
import { NAV_COPY } from '@/content/landing'
import { LINKS, LOGO_PNG, ORG, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './styles/base.css'
import './styles/chrome.css'
import './styles/hero.css'
import './styles/sections.css'
import './styles/lists.css'
import './styles/pages.css'

/** Switzer (Indian Type Foundry, ITF Free Font License), self-hosted. */
const switzer = localFont({
  src: [
    { path: '../fonts/switzer-300.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/switzer-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/switzer-500.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-switzer',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
})

const fragmentMono = Fragment_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-fragment-mono',
  display: 'swap',
  preload: false,
})

/** The site's paper in each theme; the browser's bar takes it (the toggle repeats these). */
const BAR = { light: '#F2EEE6', dark: '#0B1214' } as const

/** Without a script the bar follows the system's scheme; THEME_SCRIPT then sets the theme in use. */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BAR.light },
    { media: '(prefers-color-scheme: dark)', color: BAR.dark },
  ],
}

const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}${LOGO_PNG}` },
      description: SITE_DESCRIPTION,
      foundingLocation: { '@type': 'Place', name: 'Colombia' },
      parentOrganization: { '@type': 'Organization', name: ORG.name, url: ORG.url },
      sameAs: [LINKS.github],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
    {
      '@type': 'SoftwareSourceCode',
      '@id': `${SITE_URL}/#source`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      codeRepository: LINKS.github,
      programmingLanguage: ['TypeScript', 'Solidity'],
      license: [
        'https://opensource.org/licenses/MIT',
        'https://www.apache.org/licenses/LICENSE-2.0',
        'https://www.gnu.org/licenses/gpl-3.0.html',
      ],
      author: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

/**
 * Without JavaScript the canvases never draw, so the static SVGs show at once,
 * and the theme controls (which need a script) leave; the system's scheme applies.
 */
const NO_SCRIPT_CSS =
  '.site .plate .fallback{animation:none;opacity:1}.site .plate canvas{display:none}' +
  '.site .theme-btn{display:none}'

/**
 * Sets html[data-theme] before first paint: the stored choice ('galeon-theme'),
 * else the system's. It also points the browser's bar at that theme's paper by
 * switching the media of the two theme-color metas to 'all' and 'not all'.
 * Only media changes: React matches these metas by content when it hydrates.
 * Inline so the page never flashes the other theme; ThemeToggle keeps both in
 * step afterwards. Keep it tiny and free of imports.
 */
const THEME_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem('galeon-theme')}catch(e){}if(t!=='light'&&t!=='dark')t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';document.documentElement.setAttribute('data-theme',t);var on=t==='dark'?'${BAR.dark}':'${BAR.light}';document.querySelectorAll('meta[name="theme-color"]').forEach(function(m){var c=(m.getAttribute('content')||'').toUpperCase();if(c==='${BAR.dark}'||c==='${BAR.light}')m.setAttribute('media',c===on?'all':'not all')})})()`

/**
 * The public site: paper, ink and sea, light and dark (DESIGN.md). Static,
 * no wallet code; every section is a server component. On the client run
 * only the bar (it hides on a scroll down), the theme control, the menu and
 * the two canvases.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${switzer.variable} ${fragmentMono.variable}`}>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
      <a className="skip" href="#main">
        {NAV_COPY.skip}
      </a>
      <SiteNav />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  )
}
