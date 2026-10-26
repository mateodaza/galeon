const PATHS = {
  arrow: 'M1 7h11M8 3l4 4-4 4',
  external: 'M3 11L11 3M5 3h6v6',
  up: 'M7 13V2M3 6l4-4 4 4',
} as const

export type IconName = keyof typeof PATHS

/** Small line icons drawn at 14 units. Switzer has no arrows, so they are SVG. */
export function Icon({ name, className = 'ico' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
