'use client'

import { useEffect, useId, useState } from 'react'
import { keepWhole } from './phrased'

interface DrawerItemProps {
  readonly name: string
  readonly text: string
  /** The item that starts open on phones, so the pattern shows itself. */
  readonly startOpen?: boolean
}

/**
 * One item of a list that reads as a drawer on phones (the roadmap's next
 * steps). On desktop it is a plain item: name, then text. On phones the name
 * is a button and the text opens under it. Items only collapse once this has
 * hydrated (`data-drawer`), so without JavaScript every item shows open. Same
 * pattern as the who-sees-what rows (who-row.tsx).
 */
export function DrawerItem({ name, text, startOpen = false }: DrawerItemProps) {
  const id = useId()
  const [open, setOpen] = useState(startOpen)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])

  return (
    <li
      className="drawer-item"
      data-drawer={ready ? '' : undefined}
      data-open={open ? '' : undefined}
    >
      <h3 className="drawer-name">{name}</h3>
      <h3 className="drawer-toggle">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-text`}
          onClick={() => setOpen((o) => !o)}
        >
          <span>{name}</span>
          <i className="chev" aria-hidden="true" />
        </button>
      </h3>
      <p id={`${id}-text`}>{keepWhole(text)}</p>
    </li>
  )
}
