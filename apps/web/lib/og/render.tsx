import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { LOCKUP_NAV } from '@/components/brand/paths'
import { MarkPlate } from '@/components/marketing/mark-plate'

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = 'image/png'

const PAPER = '#F2EEE6'
const INK = '#0E1A26'
const INK_2 = '#474F56'
const SEA = '#1D5C5E'
const RULE = 'rgba(14,26,38,0.18)'

export interface OgCard {
  /** Short line above the headline. */
  eyebrow: string
  /** Headline as [line, hang in em] pairs, set in Switzer Light. Hangs are usually 0. */
  lines: readonly (readonly [string, number])[]
  /** Optional size override for longer headlines. */
  fontSize?: number
}

/** Switzer, converted from the site's WOFF2 to WOFF because the renderer cannot read WOFF2. */
async function loadFont(file: string): Promise<ArrayBuffer> {
  const buffer = await readFile(join(process.cwd(), 'lib', 'og', 'fonts', file))
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer
}

/**
 * Social card in the site's style: paper, the engraved mark in sea at the
 * right, the nav lockup, and the headline in Switzer Light.
 * Shared by every route; each passes its own eyebrow and lines.
 */
export async function renderOg({ eyebrow, lines, fontSize = 84 }: OgCard) {
  const [light, regular] = await Promise.all([
    loadFont('switzer-300.woff'),
    loadFont('switzer-400.woff'),
  ])
  const lockupH = 38
  const lockupW = (LOCKUP_NAV.width / LOCKUP_NAV.height) * lockupH

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: PAPER,
        color: INK,
        position: 'relative',
        fontFamily: 'Switzer',
      }}
    >
      <div style={{ position: 'absolute', right: -8, top: 66, display: 'flex' }}>
        <MarkPlate id="og" ink={SEA} size={500} />
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px 60px',
          width: '100%',
        }}
      >
        <svg viewBox={LOCKUP_NAV.viewBox} width={lockupW} height={lockupH}>
          <path fill={INK} transform={LOCKUP_NAV.mark.transform} d={LOCKUP_NAV.mark.d} />
          <path fill={INK} transform={LOCKUP_NAV.word.transform} d={LOCKUP_NAV.word.d} />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 24,
              fontWeight: 400,
              color: INK_2,
              marginBottom: 26,
            }}
          >
            {eyebrow}
          </div>
          {lines.map(([text, hang]) => (
            <div
              key={text}
              style={{
                display: 'flex',
                fontSize,
                fontWeight: 300,
                lineHeight: 0.98,
                letterSpacing: -0.045 * fontSize,
                paddingLeft: hang * fontSize,
              }}
            >
              {text}
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              marginTop: 40,
              paddingTop: 18,
              borderTop: `1.5px solid ${RULE}`,
              width: 640,
              fontSize: 21,
              fontWeight: 400,
              color: INK_2,
            }}
          >
            Open source · Built in Colombia
          </div>
        </div>
      </div>
    </div>,
    {
      ...OG_SIZE,
      fonts: [
        { name: 'Switzer', data: light, weight: 300, style: 'normal' },
        { name: 'Switzer', data: regular, weight: 400, style: 'normal' },
      ],
    }
  )
}
