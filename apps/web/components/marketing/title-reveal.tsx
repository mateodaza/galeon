'use client'

import { useEffect } from 'react'

/**
 * Section titles rise in line by line as they come into view, as the hero's
 * headline does on load (styles/hero.css). It sets `data-reveal` on the site
 * root, which hides each title below the hero until it is marked `data-in`.
 * Without JavaScript, under reduced motion, or without IntersectionObserver
 * nothing is hidden. Titles already above the screen (a reload mid-page) are
 * marked at once.
 */
export function TitleReveal() {
  useEffect(() => {
    const site = document.querySelector<HTMLElement>('.site')
    if (!site || typeof IntersectionObserver === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const titles = [...site.querySelectorAll<HTMLElement>('main > section:not(.hero) .display')]
    if (!titles.length) return
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
    for (const t of titles) {
      if (t.getBoundingClientRect().bottom < 0) t.setAttribute('data-in', '')
      else io.observe(t)
    }
    site.setAttribute('data-reveal', '')
    return () => {
      io.disconnect()
      site.removeAttribute('data-reveal')
    }
  }, [])
  return null
}
