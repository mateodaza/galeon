/** Treasure chest line drawing for the "Receive" step of the previous landing page. */
export function TreasureChestPattern() {
  return (
    <svg
      className="h-64 w-80"
      viewBox="0 0 280 200"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="chestGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>

      {/* Chest lid - curved top */}
      <path
        d="M80,90 Q140,60 200,90"
        fill="none"
        stroke="url(#chestGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Lid sides */}
      <line x1="80" y1="90" x2="80" y2="105" stroke="url(#chestGrad)" strokeWidth="2" />
      <line x1="200" y1="90" x2="200" y2="105" stroke="url(#chestGrad)" strokeWidth="2" />

      {/* Lid band */}
      <path
        d="M80,97 Q140,70 200,97"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.5"
      />

      {/* Chest body */}
      <rect
        x="75"
        y="105"
        width="130"
        height="70"
        rx="3"
        fill="none"
        stroke="url(#chestGrad)"
        strokeWidth="2"
      />

      {/* Horizontal bands on body */}
      <line
        x1="75"
        y1="125"
        x2="205"
        y2="125"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.4"
      />
      <line
        x1="75"
        y1="155"
        x2="205"
        y2="155"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.4"
      />

      {/* Center lock/clasp */}
      <rect
        x="130"
        y="98"
        width="20"
        height="22"
        rx="2"
        fill="none"
        stroke="url(#chestGrad)"
        strokeWidth="1.5"
      />
      <circle
        cx="140"
        cy="112"
        r="3"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="1"
        strokeOpacity="0.6"
      />

      {/* Corner reinforcements */}
      <line
        x1="75"
        y1="105"
        x2="85"
        y2="105"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <line
        x1="75"
        y1="105"
        x2="75"
        y2="115"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <line
        x1="195"
        y1="105"
        x2="205"
        y2="105"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />
      <line
        x1="205"
        y1="105"
        x2="205"
        y2="115"
        stroke="#22d3ee"
        strokeWidth="1.5"
        strokeOpacity="0.5"
      />

      {/* Sparkles floating above - incoming funds */}
      <circle
        cx="100"
        cy="55"
        r="3"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        strokeOpacity="0.6"
      />
      <circle
        cx="140"
        cy="42"
        r="4"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      <circle
        cx="175"
        cy="50"
        r="2.5"
        fill="none"
        stroke="#67e8f9"
        strokeWidth="1"
        strokeOpacity="0.5"
      />
      <circle
        cx="115"
        cy="35"
        r="2"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.4"
      />
      <circle
        cx="160"
        cy="30"
        r="2"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="0.75"
        strokeOpacity="0.35"
      />

      {/* Small sparkle highlights */}
      <circle cx="108" cy="45" r="1" fill="#ffffff" fillOpacity="0.5" />
      <circle cx="148" cy="35" r="1" fill="#ffffff" fillOpacity="0.4" />
    </svg>
  )
}
