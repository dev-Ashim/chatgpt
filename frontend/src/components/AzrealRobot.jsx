import { useEffect, useId, useRef } from 'react'

// Azreal: a white android with the red Azreal core.
// state: 'idle' | 'asleep' | 'listening' | 'thinking' | 'speaking' | 'confirm'
// compact: head only (used as the chat avatar)
// trackCursor: eyes follow the mouse
const AzrealRobot = ({ state = 'idle', compact = false, trackCursor = false, className = '' }) => {
  const rawId = useId()
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '')
  const svgRef = useRef(null)

  useEffect(() => {
    if (!trackCursor) return undefined
    const svg = svgRef.current
    let frame = 0
    const onMove = (event) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!svg) return
        const box = svg.getBoundingClientRect()
        const dx = event.clientX - (box.left + box.width / 2)
        const dy = event.clientY - (box.top + box.height * 0.3)
        const distance = Math.hypot(dx, dy) || 1
        const reach = Math.min(1, distance / 400)
        svg.style.setProperty('--lx', ((dx / distance) * 5 * reach).toFixed(2))
        svg.style.setProperty('--ly', ((dy / distance) * 3.5 * reach).toFixed(2))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
    }
  }, [trackCursor])

  const url = (name) => `url(#${name}-${id})`

  return (
    <svg
      ref={svgRef}
      className={`azr${compact ? ' is-compact' : ''}${className ? ` ${className}` : ''}`}
      data-state={state}
      viewBox={compact ? '30 0 140 128' : '0 0 200 250'}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`shell-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--azr-shell-1, #ffffff)' }} />
          <stop offset="0.6" style={{ stopColor: 'var(--azr-shell-2, #eef1f6)' }} />
          <stop offset="1" style={{ stopColor: 'var(--azr-shell-3, #d3d9e4)' }} />
        </linearGradient>
        <linearGradient id={`metal-${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--azr-metal-1, #b9c2d0)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--azr-metal-2, #eef1f6)' }} />
          <stop offset="1" style={{ stopColor: 'var(--azr-metal-3, #a9b3c3)' }} />
        </linearGradient>
        <radialGradient id={`visor-${id}`} cx="0.45" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#273049" />
          <stop offset="1" stopColor="#05070d" />
        </radialGradient>
        <radialGradient id={`core-${id}`}>
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.3" style={{ stopColor: 'var(--azr-glow)' }} />
          <stop offset="0.75" style={{ stopColor: 'var(--azr-light)' }} />
          <stop offset="1" style={{ stopColor: 'var(--azr-light)' }} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`horn-${id}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--azr-horn-1, #1a0508)' }} />
          <stop offset="1" style={{ stopColor: 'var(--azr-horn-2, #ff2d4b)' }} />
        </linearGradient>
        <filter id={`glow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id={`visorclip-${id}`}>
          <rect x="58" y="44" width="84" height="52" rx="24" />
        </clipPath>
      </defs>

      {!compact && <ellipse className="azr-shadow" cx="100" cy="242" rx="44" ry="6" />}

      <g className="azr-float">
        {!compact && (
          <g className="azr-body">
            {/* resting arm */}
            <g className="azr-arm azr-arm-rest">
              <path d="M66 150c-10 6-16 22-18 44" stroke={url('metal')} strokeWidth="13" strokeLinecap="round" fill="none" />
              <circle cx="48" cy="200" r="9" fill={url('shell')} style={{ stroke: 'var(--azr-stroke, #cdd4e0)' }} />
            </g>
            {/* waving / guiding arm */}
            <g className="azr-arm azr-arm-wave">
              <path d="M134 150c12-4 24-18 30-38" stroke={url('metal')} strokeWidth="13" strokeLinecap="round" fill="none" />
              <circle cx="166" cy="104" r="10" fill={url('shell')} style={{ stroke: 'var(--azr-stroke, #cdd4e0)' }} />
              <path d="M161 96v-7M166 94v-8M171 96v-7" style={{ stroke: 'var(--azr-detail-2, #b9c2d0)' }} strokeWidth="3" strokeLinecap="round" />
            </g>
            {/* torso */}
            <path
              d="M62 152c0-14 9-20 22-20h32c13 0 22 6 22 20l-6 52c-2 14-10 20-22 20H90c-12 0-20-6-22-20z"
              fill={url('shell')}
              style={{ stroke: 'var(--azr-stroke, #cdd4e0)' }}
            />
            <path d="M76 146c8 5 40 5 48 0" style={{ stroke: 'var(--azr-detail, #d6dce6)' }} strokeWidth="2" fill="none" />
            <path d="M80 208h40" style={{ stroke: 'var(--azr-detail, #d6dce6)' }} strokeWidth="2" strokeLinecap="round" />
            {/* Azreal core */}
            <circle cx="100" cy="174" r="15" fill="#0b0f1a" />
            <circle className="azr-core-ring" cx="100" cy="174" r="12" fill="none" style={{ stroke: 'var(--azr-light)' }} strokeWidth="1.5" strokeDasharray="6 4" />
            <circle className="azr-core" cx="100" cy="174" r="9" fill={url('core')} filter={url('glow')} />
          </g>
        )}

        {/* neck */}
        {!compact && (
          <g>
            <rect x="89" y="116" width="22" height="18" rx="5" fill={url('metal')} />
            <path d="M90 122h20M90 127h20" style={{ stroke: 'var(--azr-detail-2, #9aa5b6)' }} strokeWidth="1.2" />
          </g>
        )}

        <g className="azr-head">
          {/* antenna (hidden in the devil theme) */}
          <g className="azr-antenna-wrap">
            <line x1="100" y1="24" x2="100" y2="11" style={{ stroke: 'var(--azr-detail-2, #b9c2d0)' }} strokeWidth="3" strokeLinecap="round" />
            <circle className="azr-antenna" cx="100" cy="9" r="4.5" style={{ fill: 'var(--azr-light)' }} filter={url('glow')} />
          </g>
          {/* horns (shown by the devil theme) */}
          <g className="azr-horns">
            <path d="M62 42C54 28 48 15 44 1c14 9 26 21 33 33z" fill={url('horn')} />
            <path d="M138 42c8-14 14-27 18-41-14 9-26 21-33 33z" fill={url('horn')} />
          </g>
          {/* ear pods */}
          <g className="azr-ears">
            <circle cx="46" cy="70" r="12" fill={url('metal')} />
            <circle className="azr-ear-light" cx="46" cy="70" r="6" fill="none" style={{ stroke: 'var(--azr-light)' }} strokeWidth="2.4" filter={url('glow')} />
            <circle cx="154" cy="70" r="12" fill={url('metal')} />
            <circle className="azr-ear-light" cx="154" cy="70" r="6" fill="none" style={{ stroke: 'var(--azr-light)' }} strokeWidth="2.4" filter={url('glow')} />
          </g>
          {/* head shell */}
          <rect x="48" y="22" width="104" height="98" rx="42" fill={url('shell')} style={{ stroke: 'var(--azr-stroke, #cdd4e0)' }} />
          <path className="azr-gloss" d="M66 32c10-6 22-8 34-8" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.9" fill="none" />
          {/* visor */}
          <rect x="58" y="44" width="84" height="52" rx="24" fill={url('visor')} />
          <g clipPath={url('visorclip')}>
            <rect className="azr-scan" x="58" y="44" width="84" height="2.5" style={{ fill: 'var(--azr-light)' }} opacity="0.45" />
            <path d="M62 52c8-6 18-8 30-8" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.14" fill="none" />
          </g>
          <g className="azr-eyes">
            <rect className="azr-eye" x="71" y="60" width="20" height="12" rx="6" style={{ fill: 'var(--azr-light)' }} filter={url('glow')} />
            <rect className="azr-eye" x="109" y="60" width="20" height="12" rx="6" style={{ fill: 'var(--azr-light)' }} filter={url('glow')} />
          </g>
          {/* angry brows (shown by the devil theme) */}
          <g className="azr-brows">
            <path d="M69 55l23 6" />
            <path d="M131 55l-23 6" />
          </g>
          <g className="azr-mouth">
            {[88, 94, 100, 106, 112].map((x, index) => (
              <rect key={x} className="azr-mouth-bar" style={{ animationDelay: `${index * 90}ms`, fill: 'var(--azr-light)' }} x={x - 1.5} y="81" width="3" height="5" rx="1.5" />
            ))}
          </g>
        </g>
      </g>
    </svg>
  )
}

export default AzrealRobot
