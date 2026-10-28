'use client'

import { useEffect, useId, useState } from 'react'

interface WhoRowProps {
  readonly who: string
  readonly sees: string
  readonly hidden: string
  readonly cols: { readonly sees: string; readonly hidden: string }
  /** The row that starts open on phones, so the pattern shows itself. */
  readonly startOpen?: boolean
}

/** Keys for the two columns: solid for what a party sees, lines for what stays withheld. */
const SEES = <i className="k k-solid" aria-hidden="true" />
const WITHHELD = <i className="k k-lines" aria-hidden="true" />

/**
 * One row of the who-sees-what table. On desktop it is a plain row. On phones
 * it is a drawer: the party's name is a button, and what it sees and does not
 * see open under it. Rows only collapse once this has hydrated
 * (`data-drawer`), so without JavaScript every row shows open.
 */
export function WhoRow({ who, sees, hidden, cols, startOpen = false }: WhoRowProps) {
  const id = useId()
  const [open, setOpen] = useState(startOpen)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  return (
    <div
      className="who-row"
      role="row"
      data-drawer={ready ? '' : undefined}
      data-open={open ? '' : undefined}
    >
      <div className="c1" role="rowheader">
        <h3 className="drawer-name">{who}</h3>
        <h3 className="drawer-toggle">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${id}-sees ${id}-hidden`}
            onClick={() => setOpen((o) => !o)}
          >
            <span>{who}</span>
            <i className="chev" aria-hidden="true" />
          </button>
        </h3>
      </div>
      <div className="c2" role="cell" id={`${id}-sees`}>
        <b aria-hidden="true">
          {SEES}
          {cols.sees}
        </b>
        <p>{sees}</p>
      </div>
      <div className="c3" role="cell" id={`${id}-hidden`}>
        <b aria-hidden="true">
          {WITHHELD}
          {cols.hidden}
        </b>
        <p>{hidden}</p>
      </div>
    </div>
  )
}
