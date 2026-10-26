/** Sailboat line drawing for the "Send" step of the previous landing page. */
export function SailboatPattern() {
  return (
    <svg
      className="h-64 w-80"
      viewBox="0 0 280 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sailStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="mastStroke" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </linearGradient>
      </defs>

      {/* Hull - elegant curved line */}
      <path
        d="M40,175 Q140,185 240,175"
        fill="none"
        stroke="url(#mastStroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Left sail - outline with sail lines */}
      <path
        d="M70,170 L70,80 L100,170"
        fill="none"
        stroke="url(#sailStroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="70"
        y1="100"
        x2="92"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.5"
      />
      <line
        x1="70"
        y1="120"
        x2="86"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />

      {/* Center mast */}
      <line
        x1="140"
        y1="25"
        x2="140"
        y2="175"
        stroke="url(#mastStroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Center sail (main) - largest, with horizontal reef lines */}
      <path
        d="M140,30 L140,165 L205,165"
        fill="none"
        stroke="url(#sailStroke)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <line
        x1="140"
        y1="60"
        x2="185"
        y2="165"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.4"
      />
      <line
        x1="140"
        y1="90"
        x2="170"
        y2="165"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />
      <line
        x1="140"
        y1="120"
        x2="155"
        y2="165"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.2"
      />

      {/* Right sail - triangular, outline */}
      <path
        d="M180,170 L210,60 L240,170"
        fill="none"
        stroke="url(#sailStroke)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="210"
        y1="95"
        x2="232"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.5"
      />
      <line
        x1="210"
        y1="120"
        x2="225"
        y2="170"
        stroke="#22d3ee"
        strokeWidth="0.5"
        strokeOpacity="0.3"
      />

      {/* Small flag at top of mast */}
      <path
        d="M140,25 L155,32 L140,39"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  )
}
