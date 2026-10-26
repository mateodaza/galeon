'use client'

import { useSyncExternalStore } from 'react'
import { NAV_COPY } from '@/content/landing'

type Theme = 'light' | 'dark'

/** The stored choice; the layout's inline script reads the same key before first paint. */
const KEY = 'galeon-theme'
const DARK = '(prefers-color-scheme: dark)'
/** Each theme's paper, for the browser's bar. Same values as BAR in app/(marketing)/layout.tsx. */
const BAR: Record<Theme, string> = { light: '#F2EEE6', dark: '#0B1214' }

const asTheme = (v: string | null | undefined): Theme | null =>
  v === 'light' || v === 'dark' ? v : null

function stored(): Theme | null {
  try {
    return asTheme(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

const system = (): Theme => (window.matchMedia(DARK).matches ? 'dark' : 'light')
const current = (): Theme | null => asTheme(document.documentElement.dataset.theme)

/**
 * Points the browser's bar at the theme's paper. The layout's two theme-color
 * metas (one per scheme) stay; only their media changes, to 'all' for this
 * theme and 'not all' for the other. Their content stays as rendered, since
 * React finds these metas by it.
 */
function pointBar(theme: Theme) {
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const colour = m.content.toUpperCase()
    if (colour !== BAR.light && colour !== BAR.dark) return
    const media = colour === BAR[theme] ? 'all' : 'not all'
    if (m.media !== media) m.media = media
  })
}

function apply(theme: Theme) {
  if (current() !== theme) document.documentElement.dataset.theme = theme
  pointBar(theme)
}

/**
 * Follows html[data-theme]. While no choice is stored it tracks the system's
 * scheme; a choice made in another tab is picked up too. It also sets the
 * theme on arrival, for a visit that came from the wallet app without the
 * layout's script running.
 */
function subscribe(onChange: () => void): () => void {
  apply(stored() ?? current() ?? system())
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  // a page change can bring fresh metas; point them too
  const head = new MutationObserver(() => pointBar(current() ?? system()))
  head.observe(document.head, { childList: true })
  const scheme = window.matchMedia(DARK)
  const onSystem = () => {
    if (!stored()) apply(system())
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) apply(stored() ?? system())
  }
  scheme.addEventListener('change', onSystem)
  window.addEventListener('storage', onStorage)
  return () => {
    observer.disconnect()
    head.disconnect()
    scheme.removeEventListener('change', onSystem)
    window.removeEventListener('storage', onStorage)
  }
}

function toggle() {
  const next: Theme = (current() ?? system()) === 'dark' ? 'light' : 'dark'
  apply(next)
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // private mode: the choice holds for this page only
  }
}

/** Half a disc: the filled side turns over in dark (styles/chrome.css). */
function ThemeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 3.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
    </svg>
  )
}

/**
 * The theme control: one icon button in the bar, at every width. Its name is
 * the dark theme and aria-pressed says whether it is on. aria-pressed is left
 * off until the client knows the theme, so server and client render the same.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => null)
  const pressed = theme === null ? undefined : theme === 'dark'

  return (
    <button
      type="button"
      className="theme-btn"
      aria-label={NAV_COPY.theme.label}
      aria-pressed={pressed}
      onClick={toggle}
    >
      <ThemeIcon />
    </button>
  )
}
