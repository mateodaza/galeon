'use client'

import { useEffect } from 'react'

/**
 * Section titles rise in line by line as they come into view, as the hero's
 * headline does on load (styles/hero.css). It sets `data-reveal` on the site
 * root, which hides each title below the hero until it is marked `data-in`.
 * Without JavaScript, under reduced motion, or without IntersectionObserver
 * nothing is hidden, and turning reduced motion on later shows every title at
 * once. Titles already above the screen (a reload mid-page) are marked at once.
 * The layout stays mounted across client-side navigation, so titles a new page
 * brings in are picked up as they arrive.
 */
export function TitleReveal() {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.site')
    if (!site || typeof IntersectionObserver === 'undefined') return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (motion.matches) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute('data-in', '')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.2 }
    )
    const seen = new WeakSet<Element>()
    const scan = () => {
      for (const t of site.querySelectorAll('main > section:not(.hero) .display')) {
        if (seen.has(t)) continue
        seen.add(t)
        if (t.getBoundingClientRect().bottom < 0) t.setAttribute('data-in', '')
        else io.observe(t)
      }
    }
    scan()
    // a client-side navigation swaps the page under this layout: watch its new titles too
    const mo = new MutationObserver(scan)
    mo.observe(site, { childList: true, subtree: true })
    site.setAttribute('data-reveal', '')
    // reduced motion turned on later: show every title at once
    const onMotion = () => {
      if (!motion.matches) return
      io.disconnect()
      mo.disconnect()
      site.removeAttribute('data-reveal')
    }
    motion.addEventListener('change', onMotion)
    return () => {
      io.disconnect()
      mo.disconnect()
      motion.removeEventListener('change', onMotion)
      site.removeAttribute('data-reveal')
    }
  }, [])
  return null
}
