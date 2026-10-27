/** Lighthouse line drawing for the "Report" step of the previous landing page. */
export function LighthousePattern() {
  return (
    <svg
      className="h-64 w-80"
      viewBox="0 0 280 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="towerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="beamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Light beams - selective illumination */}
      <path d="M140,45 L240,20 L220,55 Z" fill="url(#beamGrad)" opacity="0.4" />
      <path d="M140,45 L250,60 L230,85 Z" fill="url(#beamGrad)" opacity="0.3" />
      <path d="M140,45 L240,95 L215,105 Z" fill="url(#beamGrad)" opacity="0.2" />

      {/* Lighthouse tower */}
      <path
        d="M120,180 L125,70 L155,70 L160,180 Z"
        fill="none"
        stroke="url(#towerGrad)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Horizontal stripes on tower */}
      <line
        x1="124"
        y1="100"
        x2="156"
        y2="100"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
      <line
        x1="123"
        y1="130"
        x2="157"
        y2="130"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <line
        x1="122"
        y1="160"
        x2="158"
        y2="160"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.3"
      />

      {/* Lantern room */}
      <rect
        x="118"
        y="50"
        width="44"
        height="22"
        rx="2"
        fill="none"
        stroke="url(#towerGrad)"
        strokeWidth="2"
      />

      {/* Light source glow */}
      <circle cx="140" cy="61" r="6" fill="#ffffff" fillOpacity="0.7" />
      <circle cx="140" cy="61" r="10" fill="#67e8f9" fillOpacity="0.3" />

      {/* Dome/cap */}
      <path
        d="M118,50 Q140,35 162,50"
        fill="none"
        stroke="url(#towerGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Base platform */}
      <path d="M105,180 L175,180" stroke="url(#towerGrad)" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M110,180 L115,175 L165,175 L170,180"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.5"
      />

      {/* Waves at base */}
      <path
        d="M60,185 Q80,180 100,185 Q120,190 140,185 Q160,180 180,185 Q200,190 220,185"
        fill="none"
        stroke="#0891b2"
        strokeWidth="1.5"
        strokeOpacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M50,193 Q70,188 90,193 Q110,198 130,193 Q150,188 170,193 Q190,198 210,193 Q230,188 250,193"
        fill="none"
        stroke="#06b6d4"
        strokeWidth="1"
        strokeOpacity="0.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
