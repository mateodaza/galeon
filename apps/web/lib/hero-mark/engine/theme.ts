/** The ink colour follows the theme: a toggle on html, or the system's light and dark. */

/** Calls back when the ink colour may have changed: html's data-theme or class, or the OS scheme. */
export function watchTheme(cb: () => void): () => void {
  if (typeof MutationObserver === 'undefined') return () => {}
  const mo = new MutationObserver(cb)
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  })
  const mq = typeof matchMedia === 'undefined' ? null : matchMedia('(prefers-color-scheme: dark)')
  mq?.addEventListener('change', cb)
  return () => {
    mo.disconnect()
    mq?.removeEventListener('change', cb)
  }
}
