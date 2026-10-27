'use client'

import { useEffect, useRef, type ReactNode } from 'react'

/** Scroll distance, CSS px, that reads as a change of direction; less is jitter. */
const STEP = 8

/**
 * The sticky bar. It slides away while you scroll down and returns as soon as
 * you scroll up, or near the top. The CSS keeps it in view while anything in
 * it has keyboard focus or the menu is open, and moves it by transform only,
 * so nothing below shifts. Passive listener, one read per frame.
 */
export function SiteHeader({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const bar = ref.current
    if (!bar) return
    let last = window.scrollY
    let raf = 0
    const frame = () => {
      raf = 0
      const y = window.scrollY
      if (y <= bar.offsetHeight) {
        delete bar.dataset.hidden
        last = y
        return
      }
      if (Math.abs(y - last) < STEP) return
      if (y > last) bar.dataset.hidden = ''
      else delete bar.dataset.hidden
      last = y
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
      delete bar.dataset.hidden
    }
  }, [])

  return (
    <header ref={ref} className="nav">
      {children}
    </header>
  )
}
