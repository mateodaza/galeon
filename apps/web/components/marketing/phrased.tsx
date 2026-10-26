import { Fragment } from 'react'

/** A phrase break the copy marks by hand: " | ", rendered as a plain space. */
const MARK = /\s+\|\s+/
/** After a sentence end; with clauses, also after a comma, colon or semicolon. */
const SENTENCES = /(?<=[.?!])\s+/
const CLAUSES = /(?<=[.?!,;:])\s+/

/** U+2060 WORD JOINER: no line break at this point, and nothing drawn. */
const JOIN = '⁠'
const NBSP = ' '

/**
 * Keeps the small things whole in running text: a hyphenated word (on-chain,
 * EIP-5564, one-time) never splits at its hyphen, "Privacy Pools" stays one
 * name, and a sentence never leaves its opening "The" or "A" at a line end.
 */
export function keepWhole(text: string): string {
  return text
    .replace(/(\w)-(?=\w)/g, `$1-${JOIN}`)
    .replace(/Privacy Pools/g, `Privacy${NBSP}Pools`)
    .replace(/(^|[.?!:]\s+)(The|A) /g, `$1$2${NBSP}`)
}

/**
 * Copy split into sentences (or clauses), and at any " | " the copy marks,
 * each set as one unit (`.phr`, inline-block): they share a line while there
 * is room, and a line breaks between them before it breaks inside one. So a
 * short lede ends each line where an idea ends, at every width.
 */
export function Phrased({ text, clauses = false }: { text: string; clauses?: boolean }) {
  const split = clauses ? CLAUSES : SENTENCES
  const parts = text.split(MARK).flatMap((p) => p.split(split))
  return parts.map((part, i) => (
    <Fragment key={`${i}:${part}`}>
      {i > 0 && ' '}
      <span className="phr">{keepWhole(part)}</span>
    </Fragment>
  ))
}
