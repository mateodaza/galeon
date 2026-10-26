/**
 * Post-sign-in redirect targets come from the URL (`/setup?callback=...`),
 * so anyone can craft them. Only same-origin paths are allowed: an absolute
 * URL would leave the site, and a `javascript:` URL would run in this origin.
 */

/** Fixed base so the check needs no `window` and works during prerender. */
const BASE = 'https://galeon.invalid'

export const DEFAULT_CALLBACK = '/dashboard'

/** Returns `raw` as a same-origin path, or `fallback` when it is anything else. */
export function safeCallbackPath(raw: string | null, fallback: string = DEFAULT_CALLBACK): string {
  if (!raw || !raw.startsWith('/')) return fallback
  try {
    // The URL parser normalises `\`, tabs and newlines the way browsers do,
    // so `/\evil.com` or `/\t/evil.com` resolve to another origin and fail here.
    const url = new URL(raw, BASE)
    if (url.origin !== BASE) return fallback
    // Dot segments can collapse to a leading `//` (`/..//evil.com`), which the
    // browser would read as another host once the path is navigated to.
    if (url.pathname.startsWith('//')) return fallback
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return fallback
  }
}
