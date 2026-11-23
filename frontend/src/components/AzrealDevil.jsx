// Azreal's demon avatar for Azreal mode.
// booting: plays the summoning sequence (embers gather, skull and horns draw on,
// glitch, eyes ignite). Afterwards `state` drives how it reacts.
// state: 'asleep' | 'idle' | 'listening' | 'thinking' | 'speaking' | 'confirm'

// Embers start around the avatar and fly into the centre (golden-angle spread, no randomness)
const EMBERS = Array.from({ length: 18 }, (_, i) => {
  const angle = i * 2.39996
  const distance = 110 + (i % 4) * 18
  return {
    x: Math.round(Math.cos(angle) * distance),
    y: Math.round(Math.sin(angle) * distance),
    delay: (0.1 + i * 0.06).toFixed(2),
    r: 1.2 + (i % 3) * 0.7,
  }
})

const draw = (delay, duration) => ({ '--d': `${delay}s`, '--dur': `${duration}s` })

const AzrealDevil = ({ state = 'idle', booting = false, className = '' }) => (
  <svg
    className={`azd${booting ? ' is-booting' : ''}${className ? ` ${className}` : ''}`}
    data-state={state}
    viewBox="0 0 200 200"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <radialGradient id="azd-skin" cx="0.5" cy="0.38" r="0.7">
        <stop offset="0" stopColor="#4a0f18" />
        <stop offset="0.55" stopColor="#250609" />
        <stop offset="1" stopColor="#0d0204" />
      </radialGradient>
      <linearGradient id="azd-horn" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stopColor="#3a0a11" />
        <stop offset="0.6" stopColor="#7a1626" />
        <stop offset="1" stopColor="#e0314b" />
      </linearGradient>
      <radialGradient id="azd-aura">
        <stop offset="0" stopColor="#e0314b" stopOpacity="0.45" />
        <stop offset="0.6" stopColor="#e0314b" stopOpacity="0.08" />
        <stop offset="1" stopColor="#e0314b" stopOpacity="0" />
      </radialGradient>
      <filter id="azd-glow" x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.4" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>

    <circle className="azd-aura" cx="100" cy="100" r="98" fill="url(#azd-aura)" />

    {/* Summoning circle */}
    <g className="azd-circle">
      <circle className="azd-draw azd-ring" cx="100" cy="100" r="92" pathLength="1" style={draw(0.05, 0.9)} />
      <g className="azd-runes">
        <circle className="azd-rune-ring" cx="100" cy="100" r="84" />
      </g>
      <g className="azd-arcs">
        <circle className="azd-arc" cx="100" cy="100" r="88" pathLength="1" />
      </g>
    </g>

    {/* Embers that gather while the avatar forms */}
    <g className="azd-embers">
      {EMBERS.map((e, i) => (
        <circle
          key={i}
          className="azd-ember"
          cx="100"
          cy="100"
          r={e.r}
          style={{ '--x': `${e.x}px`, '--y': `${e.y}px`, '--d': `${e.delay}s` }}
        />
      ))}
    </g>

    <g className="azd-figure">
      {/* Horns */}
      <path className="azd-draw azd-horn" pathLength="1" style={draw(1.55, 0.6)} d="M80 50 Q55 36 47 6 Q36 38 62 66 Z" />
      <path className="azd-draw azd-horn" pathLength="1" style={draw(1.55, 0.6)} d="M120 50 Q145 36 153 6 Q164 38 138 66 Z" />

      {/* Skull */}
      <path
        className="azd-draw azd-head"
        pathLength="1"
        style={draw(0.6, 1)}
        d="M100 38 L128 49 L141 77 L135 112 L120 141 L100 160 L80 141 L65 112 L59 77 L72 49 Z"
      />
      {/* Goatee */}
      <path className="azd-draw azd-head" pathLength="1" style={draw(1.3, 0.4)} d="M92 152 L100 176 L108 152 Z" />

      {/* Face lines: brow, cheekbones, forehead mark */}
      <path className="azd-draw azd-line" pathLength="1" style={draw(1.1, 0.5)} d="M68 79 L100 91 L132 79" />
      <path className="azd-draw azd-line" pathLength="1" style={draw(1.2, 0.4)} d="M65 112 L84 121 M135 112 L116 121" />
      <path className="azd-draw azd-line" pathLength="1" style={draw(1.25, 0.4)} d="M100 48 L94 60 L100 72 L106 60 Z" />
      <path className="azd-draw azd-line" pathLength="1" style={draw(1.3, 0.3)} d="M100 100 L96 115 L100 118 L104 115 Z" />

      {/* Eyes */}
      <g className="azd-eyes" filter="url(#azd-glow)">
        <path className="azd-eye" d="M72 89 L95 97 L77 100 Z" />
        <path className="azd-eye" d="M128 89 L105 97 L123 100 Z" />
      </g>

      {/* Grin and fangs */}
      <g className="azd-mouth">
        <path className="azd-mouth-glow" filter="url(#azd-glow)" d="M77 126 Q100 142 123 126 Q100 134 77 126 Z" />
        <path className="azd-fang" d="M86 129.5 L89 139 L92 131.6 Z" />
        <path className="azd-fang" d="M114 129.5 L111 139 L108 131.6 Z" />
      </g>
    </g>

    {/* Ignition flash */}
    <circle className="azd-flash" cx="100" cy="100" r="96" />
  </svg>
)

export default AzrealDevil
