import localFont from 'next/font/local'
import { Fragment_Mono } from 'next/font/google'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteNav } from '@/components/marketing/site-nav'
import { NAV_COPY } from '@/content/landing'
import { LINKS, LOGO_PNG, ORG, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'
import './site.css'

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
      programmingLanguage: ['TypeScript', 'Solidity', 'Circom'],
      license: [
        'https://opensource.org/licenses/MIT',
        'https://www.apache.org/licenses/LICENSE-2.0',
      ],
      author: { '@id': `${SITE_URL}/#organization` },
    },
  ],
}

/** Without JavaScript the hero canvas never draws, so its static SVG shows at once. */
const NO_SCRIPT_CSS =
  '.site .plate .fallback{animation:none;opacity:1}.site .plate canvas{display:none}'

/**
 * The public site: paper, ink and sea (DESIGN.md). Static, no wallet code;
 * every section is a server component. Only the menu and the hero canvas
 * run on the client.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`site ${switzer.variable} ${fragmentMono.variable}`}>
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
