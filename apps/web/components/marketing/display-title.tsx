import type { CSSProperties, ReactNode } from 'react'
import type { DisplayTitle as DisplayTitleCopy } from '@/content/landing'

interface DisplayTitleProps {
  title: DisplayTitleCopy
  as?: 'h1' | 'h2'
  id?: string
  className?: string
}

/** Desktop size is set against a 1344 px column, phone size against 390 px. */
function sizeVars(size: DisplayTitleCopy['size']): CSSProperties | undefined {
  if (!size) return undefined
  return {
    '--dk': (size.desktop / 1344).toFixed(5),
    '--ph': `${(size.phone / 3.9).toFixed(2)}vw`,
  } as CSSProperties
}

/** A line's text, with the copy's redacted word (if it is in the line) wrapped to carry the bar. */
function withRedaction(text: string, word: string | undefined): ReactNode {
  const at = word ? text.indexOf(word) : -1
  if (!word || at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <span className="redact">{word}</span>
      {text.slice(at + word.length)}
    </>
  )
}

/**
 * A large headline set line by line: the desktop break, then the phone break.
 * Lines end where phrases end; a line hangs only when the copy gives it a
 * hang. Each line carries its index (`--i`), so the lines can rise in one
 * after another (styles/hero.css, title-reveal.tsx). Both visual sets are hidden from assistive tech; the sentence is read
 * once.
 */
export function DisplayTitle({ title, as: Tag = 'h2', id, className }: DisplayTitleProps) {
  const sentence = title.lines.map(([text]) => text).join(' ')
  return (
    <Tag
      id={id}
      className={className ? `display ${className}` : 'display'}
      style={sizeVars(title.size)}
    >
      <span className="sr">{sentence}</span>
      {title.lines.map(([text, hang], i) => (
        <span
          key={text}
          className="ln dk"
          aria-hidden="true"
          style={{ '--hang': hang, '--i': i } as CSSProperties}
        >
          {withRedaction(text, title.redact)}
        </span>
      ))}
      {title.phone.map((text, i) => (
        <span key={text} className="ln ph" aria-hidden="true" style={{ '--i': i } as CSSProperties}>
          {withRedaction(text, title.redact)}
        </span>
      ))}
    </Tag>
  )
}
