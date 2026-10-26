/** The ruled label above a section headline: a short rule, the number, the name. */
export function SectionLabel({ n, label, id }: { n?: string; label: string; id?: string }) {
  return (
    <p className="label" id={id}>
      <i aria-hidden="true" />
      {n && <span>{n}</span>}
      <b>{label}</b>
    </p>
  )
}
