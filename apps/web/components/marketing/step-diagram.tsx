import { HOW } from '@/content/landing'

const D = HOW.diagram
const ADDRESSES = ['0x4f2c…91a0', '0xb81e…07d3', '0x2a9d…e5c4']
const ROW_Y = [48, 84, 120]

const receive = (
  <g>
    <text className="d-t-soft" x="62" y="14" textAnchor="middle">
      {D.port}
    </text>
    <path className="d-soft" d="M30 26V21H94V26" />
    {ROW_Y.map((y, i) => (
      <g key={y}>
        <circle className="d-soft d-paper" cx="20" cy={y} r="5" />
        <path className="d-ink" d={`M29 ${y}H104M98 ${y - 3.5}l6 3.5-6 3.5`} />
        <rect className="d-ink d-paper" x="110" y={y - 6} width="12" height="12" />
        <text className="d-t" x="130" y={y + 3.5}>
          {ADDRESSES[i]}
        </text>
      </g>
    ))}
    <path
      className="d-dash"
      d="M218 48C246 48 248 84 266 84M218 84H266M218 120C246 120 248 84 266 84"
    />
    <circle className="d-sea" cx="276" cy="84" r="7" />
    <text className="d-t-soft" x="276" y="110" textAnchor="middle">
      {D.recipient}
    </text>
    <text className="d-t-soft" x="20" y="152" textAnchor="middle">
      {D.payers}
    </text>
    <text className="d-t-soft" x="116" y="152" textAnchor="middle">
      {D.addresses}
    </text>
  </g>
)

const POOL_DOTS = [127, 147, 167].flatMap((x) => [64, 80, 96].map((y) => [x, y] as const))
const OUTSIDE_DOTS = [
  [197, 60],
  [199, 98],
  [148, 127],
  [98, 64],
] as const

const settle = (
  <g>
    {[56, 80, 104].map((y) => (
      <circle key={y} className="d-soft d-paper" cx="16" cy={y} r="4" />
    ))}
    <path className="d-ink" d="M24 56L86.6 70.6M24 80H86M24 104L86.6 89.4" />
    <circle className="d-ink" cx="150" cy="80" r="62" />
    <rect className="d-dash-ink" x="110" y="48" width="74" height="64" rx="20" />
    <g className="d-fill">
      {POOL_DOTS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
      ))}
    </g>
    {OUTSIDE_DOTS.map(([x, y]) => (
      <circle key={`${x}-${y}`} className="d-soft d-paper" cx={x} cy={y} r="3" />
    ))}
    <path className="d-ink" d="M214 80H262M256 76.5l6 3.5-6 3.5" />
    <text className="d-t-soft" x="238" y="70" textAnchor="middle">
      {D.proof}
    </text>
    <circle className="d-sea" cx="276" cy="80" r="7" />
    <text className="d-t-soft" x="150" y="11" textAnchor="middle">
      {D.approved}
    </text>
    <path className="d-soft" d="M150 16V48" />
    <text className="d-t-soft" x="150" y="157" textAnchor="middle">
      {D.pool}
    </text>
  </g>
)

/** Placeholder bars for the report rows: [x, width] for amount; date and party are fixed. */
const REPORT_ROWS = [
  [83, 80, 32, 48],
  [101, 72, 40, 40],
  [119, 88, 24, 50],
  [137, 76, 36, 44],
] as const

const prove = (
  <g>
    <rect className="d-ink d-paper" x="4" y="6" width="184" height="148" />
    <text className="d-t-ink" x="16" y="26">
      {D.report}
    </text>
    <text className="d-t-soft" x="176" y="26" textAnchor="end">
      {D.period}
    </text>
    <text className="d-t-soft" x="16" y="44">
      {D.scope}
    </text>
    <path className="d-rule" d="M4 54H188" />
    <text className="d-t-soft" x="16" y="70">
      {D.cols[0]}
    </text>
    <text className="d-t-soft" x="112" y="70" textAnchor="end">
      {D.cols[1]}
    </text>
    <text className="d-t-soft" x="126" y="70">
      {D.cols[2]}
    </text>
    <g className="d-row">
      {REPORT_ROWS.map(([y, ax, aw, pw]) => (
        <g key={y}>
          <rect x="16" y={y} width="40" height="2" />
          <rect x={ax} y={y} width={aw} height="2" />
          <rect x="126" y={y} width={pw} height="2" />
        </g>
      ))}
    </g>
    <path className="d-ink" d="M196 80H262M256 76.5l6 3.5-6 3.5" />
    <text className="d-t-soft" x="229" y="70" textAnchor="middle">
      {D.sent}
    </text>
    <circle className="d-sea" cx="276" cy="80" r="7" />
    <text className="d-t-soft" x="276" y="106" textAnchor="middle">
      {D.reader}
    </text>
  </g>
)

const DIAGRAMS = {
  receive: { body: receive, alt: D.receiveAlt },
  settle: { body: settle, alt: D.settleAlt },
  prove: { body: prove, alt: D.proveAlt },
} as const

export type DiagramKind = keyof typeof DIAGRAMS

/** The small line diagram above each step of How it works. */
export function StepDiagram({ kind }: { kind: DiagramKind }) {
  const d = DIAGRAMS[kind]
  return (
    <svg className="diagram" viewBox="0 0 300 160" role="img" aria-label={d.alt}>
      {d.body}
    </svg>
  )
}
