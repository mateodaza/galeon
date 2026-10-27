/** The small label above a section headline: the section's name, nothing else. */
export function SectionLabel({ label, id }: { label: string; id?: string }) {
  return (
    <p className="label" id={id}>
      <b>{label}</b>
    </p>
  )
}
