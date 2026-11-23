import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import AzrealDevil from './AzrealDevil'
import '../auth-horror.css'

// What the demon says, by situation. Login and register get their own voice.
const TAUNTS = {
  login: {
    booting: 'Something stirs beneath the circle…',
    idle: 'You came back. They always come back.',
    email: 'Speak the name you were bound by.',
    password: "I won't look. I don't need to.",
    loading: 'Weighing your soul…',
    error: 'Wrong. The circle remembers every mistake.',
  },
  register: {
    booting: 'A new soul approaches the circle…',
    idle: 'Sign your name. Ink is optional.',
    email: 'Every pact needs an address.',
    password: 'Choose a secret. I will keep it… forever.',
    loading: 'Sealing the pact…',
    error: 'The pact was rejected.',
    name: 'A name. How deliciously personal.',
  },
}

// Embers drifting up through the 3D scene (deterministic spread, no Math.random)
const EMBERS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  z: ((i * 53) % 240) - 120,
  delay: ((i * 0.73) % 7).toFixed(2),
  dur: (6 + (i % 5) * 1.4).toFixed(2),
  size: 2 + (i % 3),
}))

const RUNES = 'ᚨᛉᚱᛖᚨᛚ✠ᛞᚨᛗᚾᚨᛏᛁᛟ✠ᚦᚢᚱᛊ✠'

const AuthLayout = ({
  mode = 'login',
  eyebrow,
  title,
  description,
  footerText,
  footerLabel,
  footerTo,
  status = 'idle',
  error = '',
  children,
}) => {
  const shellRef = useRef(null)
  const [booting, setBooting] = useState(true)
  const [focus, setFocus] = useState(null)

  // Summoning sequence on mount
  useEffect(() => {
    const id = setTimeout(() => setBooting(false), 3400)
    return () => clearTimeout(id)
  }, [])

  // Pointer-driven 3D tilt + eye tracking, smoothed with rAF (no React re-renders)
  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let tx = 0
    let ty = 0
    let cx = 0
    let cy = 0
    let frame = 0

    const onMove = (event) => {
      tx = (event.clientX / window.innerWidth) * 2 - 1
      ty = (event.clientY / window.innerHeight) * 2 - 1
    }
    const tick = () => {
      cx += (tx - cx) * 0.06
      cy += (ty - cy) * 0.06
      shell.style.setProperty('--px', cx.toFixed(4))
      shell.style.setProperty('--py', cy.toFixed(4))
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('pointermove', onMove)
    frame = requestAnimationFrame(tick)
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  const handleFocus = (event) => {
    const { type, name } = event.target
    if (type === 'password') setFocus('password')
    else if (type === 'email') setFocus('email')
    else if (name === 'firstName' || name === 'lastName') setFocus('name')
    else setFocus(null)
  }
  const handleBlur = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocus(null)
  }

  // Situation → avatar state + caption
  let situation = 'idle'
  if (booting) situation = 'booting'
  else if (status === 'loading') situation = 'loading'
  else if (status === 'error') situation = 'error'
  else if (focus) situation = focus

  const avatarState = {
    booting: 'idle',
    idle: 'idle',
    email: 'listening',
    name: 'listening',
    password: 'asleep',
    loading: 'thinking',
    error: 'confirm',
  }[situation]

  const lines = TAUNTS[mode] || TAUNTS.login
  const caption = situation === 'error' && error ? `${lines.error} (${error})` : lines[situation] || lines.idle

  return (
    <main ref={shellRef} className={`hx-shell is-${situation}`}>
      <div className="hx-backdrop" aria-hidden="true">
        <div className="hx-vignette" />
        <div className="hx-fog hx-fog-a" />
        <div className="hx-fog hx-fog-b" />
        <div className="hx-lightning" />
        <div className="hx-scanlines" />
      </div>

      <aside className="hx-showcase">
        <Link className="hx-brand" to="/">
          <span className="hx-brand-mark" aria-hidden="true">✠</span> AZREAL
        </Link>

        <div className="hx-stage" aria-hidden="true">
          <div className="hx-world">
            {/* Summoning floor */}
            <div className="hx-floor">
              <svg viewBox="0 0 400 400">
                <circle cx="200" cy="200" r="190" />
                <circle cx="200" cy="200" r="170" />
                <circle cx="200" cy="200" r="120" className="hx-floor-thin" />
                <polygon points="200,30 300,338 38,148 362,148 100,338" />
                <text>
                  <textPath href="#hx-rune-path" startOffset="0">{RUNES.repeat(3)}</textPath>
                </text>
                <defs>
                  <path id="hx-rune-path" d="M200,200 m-180,0 a180,180 0 1,1 360,0 a180,180 0 1,1 -360,0" />
                </defs>
              </svg>
            </div>

            {/* Gyroscope of rune rings orbiting the avatar */}
            <div className="hx-gyro">
              <div className="hx-ring hx-ring-a" />
              <div className="hx-ring hx-ring-b" />
              <div className="hx-ring hx-ring-c" />
            </div>

            {/* Floating avatar */}
            <div className="hx-avatar">
              <div className="hx-avatar-glow" />
              <AzrealDevil booting={booting} state={avatarState} className="hx-devil" />
            </div>

            {/* Embers at different depths */}
            <div className="hx-embers">
              {EMBERS.map((e, i) => (
                <span
                  key={i}
                  style={{
                    left: `${e.left}%`,
                    width: e.size,
                    height: e.size,
                    '--z': `${e.z}px`,
                    animationDelay: `${e.delay}s`,
                    animationDuration: `${e.dur}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="hx-caption" role="status" aria-live="polite">
          <span className="hx-caption-name">Azreal</span>
          <span key={caption} className="hx-caption-text">{caption}</span>
        </p>
      </aside>

      <section className="hx-main">
        <div className="hx-card" onFocus={handleFocus} onBlur={handleBlur}>
          <header className="hx-heading">
            <p className="hx-eyebrow">{eyebrow}</p>
            <h1 data-text={title}>{title}</h1>
            <p className="hx-intro">{description}</p>
          </header>

          {error && status === 'error' && (
            <p className="hx-error" role="alert">
              <span aria-hidden="true">⛧</span> {error}
            </p>
          )}

          {children}

          <p className="hx-switch">
            {footerText} <Link to={footerTo}>{footerLabel}</Link>
          </p>
        </div>
      </section>
    </main>
  )
}

export default AuthLayout
