import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { LOCKUP_NAV } from '@/components/brand/paths'
import { MarkPlate } from '@/components/marketing/mark-plate'

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = 'image/png'

/** The deep band's colours (styles/base.css): the card stands out in a light feed and a dark one. */
const DEEP = '#13303A'
const ON = '#F2EEE6'
const ON_2 = 'rgba(242,238,230,0.78)'
const SEA_DK = '#93C6C7'
const RULE = 'rgba(242,238,230,0.24)'

/** What the protocol is built from, under every headline. */
const TECH = 'Stealth addresses · Privacy pools · Zero-knowledge proofs'

export interface OgCard {
  /** Short line above the headline. */
  eyebrow: string
  /** Headline as [line, hang in em] pairs, set in Switzer Light. Hangs are usually 0. */
  lines: readonly (readonly [string, number])[]
  /** Optional size override for longer headlines. */
  fontSize?: number
  /** The line under the rule. Default: the three technologies. */
  footer?: string
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
 * Social card in the site's style: the deep sea band, the whole engraved mark
 * in sea on dark at the right, the nav lockup, and the headline in Switzer
 * Light. Shared by every route; each passes its own eyebrow and lines.
 */
export async function renderOg({ eyebrow, lines, fontSize = 88, footer = TECH }: OgCard) {
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
        background: DEEP,
        color: ON,
        position: 'relative',
        fontFamily: 'Switzer',
      }}
    >
      <div style={{ position: 'absolute', right: 52, top: 75, display: 'flex' }}>
        <MarkPlate id="og" ink={SEA_DK} size={480} />
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
          <path fill={SEA_DK} transform={LOCKUP_NAV.mark.transform} d={LOCKUP_NAV.mark.d} />
          <path fill={ON} transform={LOCKUP_NAV.word.transform} d={LOCKUP_NAV.word.d} />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              fontSize: 24,
              fontWeight: 400,
              color: SEA_DK,
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
              width: 570,
              fontSize: 21,
              fontWeight: 400,
              color: ON_2,
            }}
          >
            {footer}
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
