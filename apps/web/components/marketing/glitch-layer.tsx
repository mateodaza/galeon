'use client'

import { useEffect, useRef } from 'react'
import { reducedFlag } from './use-plate-engine'

/**
 * The hero's hide-and-show (lib/hero-mark/engine/slices.ts), carried over the
 * closing band in square blocks. One glitch moment lasts G seconds, recut every
 * TICK seconds, blocks jumping up to AMP px; blocks start up to STAGGER s apart
 * and sit on a GRID px grid.
 */
const G = 0.3
const TICK = 0.05
const AMP = 12
const STAGGER = 0.14
const GRID = 6
/** A cluster: TILES to TILES + TILES_VAR blocks, SIZE to SIZE + SIZE_VAR px across, scattered within REACH_X by REACH_Y px of its centre. */
const TILES = 10
const TILES_VAR = 8
const SIZE = 18
const SIZE_VAR = 30
const REACH_X = 96
const REACH_Y = 56
/** A mouse moves on to a new cluster once it is LEAVE px from the old one's centre, but no sooner than MIN_GAP s. */
const LEAVE = 70
const MIN_GAP = 0.3
/** With no mouse: the first hiding after FIRST s in view, then the content shows whole for REST to REST + REST_VAR s; each cluster stays hidden HIDE to HIDE + HIDE_VAR s. */
const FIRST = 2.5
const REST = 3
const REST_VAR = 2
const HIDE = 1.5
const HIDE_VAR = 1

/** A fixed share in 0..1 per block, tick and salt. */
function hash(k: number, j: number, salt: number): number {
  const v = Math.sin(k * 91.17 + j * 12.9898 + salt * 78.233) * 43758.5453
  return v - Math.floor(v)
}

/** A box, in px from the band's top left corner. */
type Box = readonly [x: number, y: number, w: number, h: number]

/**
 * Where there is something to hide, relative to the section: the line boxes
 * (not the blocks) of every element matching `lines`, and the box of every
 * element matching `blocks`, inset a little.
 */
function contentBoxes(
  band: HTMLElement,
  lines: string | undefined,
  blocks: string | undefined
): Box[] {
  const b = band.getBoundingClientRect()
  const out: Box[] = []
  const add = (r: DOMRect, pad: number) => {
    if (r.width > 0 && r.height > 0)
      out.push([r.left - b.left - pad, r.top - b.top - pad, r.width + 2 * pad, r.height + 2 * pad])
  }
  const range = document.createRange()
  if (lines)
    for (const el of band.querySelectorAll(lines)) {
      range.selectNodeContents(el)
      for (const r of range.getClientRects()) add(r, 3)
    }
  if (blocks) for (const el of band.querySelectorAll(blocks)) add(el.getBoundingClientRect(), -4)
  return out
}

/** The section's own colour: its background, or the page's paper when it has none. */
function groundOf(band: HTMLElement): string {
  const bg = getComputedStyle(band).backgroundColor
  if (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) return bg
  const site = band.closest<HTMLElement>('.site') ?? document.body
  return getComputedStyle(site).getPropertyValue('--paper').trim() || '#f2eee6'
}

/** A hidden cluster: its centre, px; when it began hiding, and when it began to show again (null while hidden). */
interface Hidden {
  readonly id: number
  /** The cluster's scale: blocks and reach. */
  readonly s: number
  readonly cx: number
  readonly cy: number
  readonly from: number
  until: number | null
}

const snap = (v: number) => Math.round(v / GRID) * GRID

/**
 * Whether a block is covered v seconds into its glitch, on the way out
 * (hiding) or in (showing), and its sideways jump: stepped, settling as it ends.
 */
function glitchBlock(v: number, k: number, hiding: boolean): [boolean, number] {
  const tick = Math.floor(v / TICK)
  const settle = v / G
  const p = hash(k, tick, hiding ? 1 : 2)
  const covered = hiding ? p < 0.2 + 0.8 * settle : p > 0.2 + 0.8 * settle
  const dx = snap((hash(k, tick, 3) * 2 - 1) * AMP * (1 - 0.7 * settle))
  return [covered, dx]
}

/**
 * Draws one hidden cluster at time now (s): square blocks in the band's own
 * colour, each glitching out and back in at its own moment; while they glitch,
 * a hairline streak and a vertical tear flash across the cluster.
 */
function drawHidden(
  c: CanvasRenderingContext2D,
  h: Hidden,
  now: number,
  bg: string,
  accent: string
) {
  const out = now - h.from
  const back = h.until === null ? -1 : now - h.until
  const n = TILES + Math.floor(hash(h.id, 0, 4) * (TILES_VAR + 1))
  c.fillStyle = bg
  let glitching = false
  for (let j = 0; j < n; j++) {
    const k = h.id * 97 + j
    const lag = STAGGER * hash(k, 0, 5)
    const vOut = out - lag
    const vIn = back - lag
    if (vOut < 0 || vIn >= G) continue
    let covered = true
    let dx = 0
    if (vIn >= 0) [covered, dx] = glitchBlock(vIn, k, false)
    else if (vOut < G) [covered, dx] = glitchBlock(vOut, k, true)
    glitching ||= dx !== 0 || vOut < G || vIn >= 0
    if (!covered) continue
    // nearer the centre more often, so the blocks gather into one cluster
    const r = Math.pow(hash(k, 0, 6), 0.7)
    const a = hash(k, 0, 7) * Math.PI * 2
    const size = (SIZE + SIZE_VAR * hash(k, 0, 8)) * h.s
    const w = snap(size * (0.8 + 0.5 * hash(k, 0, 9)))
    const hh = snap(size * (0.7 + 0.4 * hash(k, 0, 10)))
    const x = snap(h.cx + Math.cos(a) * r * REACH_X * h.s - w / 2) + dx
    const y = snap(h.cy + Math.sin(a) * r * REACH_Y * h.s - hh / 2)
    c.fillRect(x, y, w, hh)
  }
  if (!glitching) return
  const tick = Math.floor((back >= 0 ? back : out) / (TICK * 2))
  c.fillStyle = accent
  c.globalAlpha = 0.45
  if (hash(h.id, tick, 11) < 0.5)
    c.fillRect(
      snap(h.cx + (hash(h.id, tick, 12) * 2 - 1) * REACH_X * h.s),
      h.cy - REACH_Y * h.s * 1.3,
      1,
      REACH_Y * h.s * 2.6
    )
  if (hash(h.id, tick, 13) < 0.5)
    c.fillRect(
      h.cx - REACH_X * h.s * 1.4,
      snap(h.cy + (hash(h.id, tick, 14) * 2 - 1) * REACH_Y * h.s),
      REACH_X * h.s * (1.6 + hash(h.id, tick, 15)),
      1
    )
  c.globalAlpha = 1
}

interface GlitchLayerProps {
  /** Elements whose lines may be hidden (each line box on its own). */
  readonly lines?: string
  /** Elements hidden as a whole box (the marks). */
  readonly blocks?: string
  /** With no mouse, hide a piece of the content on its own now and then. */
  readonly ambient?: boolean
  /** How large the clusters are, against the default. */
  readonly scale?: number
}

/**
 * The hide-and-show glitch over a section (the hero's, lib/hero-mark/engine/
 * slices.ts, in square blocks), drawn on a canvas laid over the whole section;
 * the section must be positioned. A mouse over the section hides the content
 * under it behind a cluster of blocks in the section's own colour: they glitch
 * out one by one, stay while the mouse is there, and glitch back in when it
 * moves on, where a new cluster hides. With `ambient` and no mouse (always on
 * touch), every few seconds a cluster hides a piece of the content on its own,
 * holds, and comes back. It only ever draws over something to hide (`lines`
 * and `blocks`), never on empty ground. Decorative and pointer-transparent;
 * nothing is drawn under reduced motion.
 */
export function GlitchLayer({ lines, blocks, ambient = false, scale = 1 }: GlitchLayerProps) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const band = canvas?.parentElement
    const c = canvas?.getContext('2d')
    if (!canvas || !band || !c) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)')
    let raf = 0
    let visible = false
    let boxes: Box[] = []
    let hidden: Hidden[] = []
    let ids = 0
    let clock = 0
    let last = 0
    let pointer: [number, number] | null = null
    let held: Hidden | null = null
    let lastSpawn = -1
    let nextAmbient = FIRST

    const size = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(band.clientWidth * dpr)
      canvas.height = Math.round(band.clientHeight * dpr)
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      boxes = contentBoxes(band, lines, blocks)
    }

    const spawn = (cx: number, cy: number): Hidden => {
      const h: Hidden = { id: ids++, s: scale, cx, cy, from: clock, until: null }
      hidden.push(h)
      lastSpawn = clock
      return h
    }
    const release = (h: Hidden | null) => {
      if (h && h.until === null) h.until = Math.max(clock, h.from + G + STAGGER)
    }

    const step = () => {
      // the mouse holds a cluster where it rests, and moves on to a new one as it goes
      if (pointer !== null) {
        const away = !held || Math.hypot(pointer[0] - held.cx, pointer[1] - held.cy) > LEAVE * scale
        if (away && clock - lastSpawn > MIN_GAP) {
          release(held)
          held = spawn(pointer[0], pointer[1])
        }
      } else if (held) {
        release(held)
        held = null
      }
      // with no mouse, a piece of the content hides now and then on its own
      if (ambient && pointer === null && !hidden.length && clock >= nextAmbient && boxes.length) {
        const k = ids
        const [x, y, bw, bh] = boxes[Math.floor(hash(k, 0, 16) * boxes.length)]
        const h = spawn(x + bw * hash(k, 0, 17), y + bh * (0.2 + 0.6 * hash(k, 0, 18)))
        h.until = clock + G + STAGGER + HIDE + HIDE_VAR * hash(k, 0, 19)
      }
      // a cluster that has shown again is done
      const before = hidden.length
      hidden = hidden.filter((h) => h.until === null || clock - h.until < G + STAGGER)
      if (pointer === null && before && !hidden.length)
        nextAmbient = clock + REST + REST_VAR * hash(ids, 0, 14)
    }

    const frame = (now: number) => {
      raf = 0
      const w = band.clientWidth
      c.clearRect(0, 0, w, band.clientHeight)
      if (!visible || motion.matches || reducedFlag()) return
      clock += last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      step()
      if (hidden.length && boxes.length) {
        const bg = groundOf(band)
        const accent = getComputedStyle(band).getPropertyValue('--plate-ink').trim() || '#1d5c5e'
        c.save()
        c.beginPath()
        for (const [x, y, bw, bh] of boxes) c.rect(x, y, bw, bh)
        c.clip()
        for (const h of hidden) drawHidden(c, h, clock, bg, accent)
        c.restore()
      }
      raf = requestAnimationFrame(frame)
    }
    const start = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !fine.matches) return
      const r = band.getBoundingClientRect()
      pointer = [e.clientX - r.left, e.clientY - r.top]
      start()
    }
    const onLeave = () => {
      pointer = null
    }
    // the words may have moved since they were measured (they rise in on load): measure again
    const onEnter = () => {
      boxes = contentBoxes(band, lines, blocks)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
      last = 0
      if (visible) start()
    })
    const ro = new ResizeObserver(size)
    size()
    // the text's line boxes move once the web fonts have loaded
    void document.fonts?.ready.then(size)
    io.observe(band)
    ro.observe(band)
    band.addEventListener('pointermove', onMove, { passive: true })
    band.addEventListener('pointerleave', onLeave)
    band.addEventListener('pointerenter', onEnter)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      band.removeEventListener('pointermove', onMove)
      band.removeEventListener('pointerleave', onLeave)
      band.removeEventListener('pointerenter', onEnter)
    }
  }, [lines, blocks, ambient, scale])
  return <canvas ref={ref} className="glitch-layer" aria-hidden="true" />
}
