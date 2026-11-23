import { useEffect, useRef, useState } from 'react'
import AzrealDevil from './AzrealDevil'
import { playBootSound, playCue } from './azrealSfx'
import { createAzreal, hasSpeechRecognition, listVoices } from './azrealVoice'

// The local Azreal core (jarvis/server.js) that runs commands on this PC
const CORE_URL = import.meta.env.VITE_AZREAL_URL || 'http://127.0.0.1:7777'

const STATUS_LABELS = {
  asleep: 'Tap the core to wake Azreal',
  idle: 'Standing by',
  listening: 'Listening…',
  thinking: 'Processing…',
  speaking: 'Speaking',
  confirm: 'Awaiting your approval',
}

// Lines shown while the avatar is summoned; delays match the animation and sound
const BOOT_LINES = [
  { at: 0.1, text: 'opening the summoning circle' },
  { at: 0.7, text: 'forging the skull' },
  { at: 1.55, text: 'raising the horns' },
  { at: 2.2, text: 'binding to this machine' },
  { at: 2.7, text: 'igniting the eyes' },
]
const BOOT_MS = 3600

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

const readSetting = (key, fallback) => {
  try {
    const value = localStorage.getItem(`azreal.${key}`)
    return value === null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

const saveSetting = (key, value) => {
  try {
    localStorage.setItem(`azreal.${key}`, JSON.stringify(value))
  } catch {
    // Storage unavailable: the setting just won't be remembered
  }
}

const AzrealMode = ({ userName, onTranscribe }) => {
  const [online, setOnline] = useState(null)
  const [status, setStatus] = useState('asleep')
  const [log, setLog] = useState([])
  const [interim, setInterim] = useState('')
  const [draft, setDraft] = useState('')
  const [voices, setVoices] = useState(listVoices)
  const [settings, setSettings] = useState(() => ({
    voice: readSetting('voice', ''),
    lang: readSetting('lang', 'en-IN'),
    convo: readSetting('convo', false),
    wake: readSetting('wake', false),
    sfx: readSetting('sfx', true),
  }))
  // Each value starts one summoning sequence; 0 means skip it (reduced motion)
  const [bootRun, setBootRun] = useState(() => (prefersReducedMotion() ? 0 : 1))
  const [booting, setBooting] = useState(() => !prefersReducedMotion())
  const stopBootSound = useRef(null)
  const lastStatus = useRef(status)

  const controller = useRef(null)
  const settingsRef = useRef(settings)
  const userNameRef = useRef(userName)
  const transcribeRef = useRef(onTranscribe)
  const logEndRef = useRef(null)
  const bootingRef = useRef(booting)
  const skipBootRef = useRef(null)

  useEffect(() => {
    settingsRef.current = settings
    userNameRef.current = userName
    transcribeRef.current = onTranscribe
    bootingRef.current = booting
    skipBootRef.current = skipBoot
  })

  useEffect(() => {
    const add = (item) => setLog((items) => [...items, { id: crypto.randomUUID(), ...item }])
    const azreal = createAzreal({
      coreUrl: CORE_URL,
      getSettings: () => settingsRef.current,
      getUserName: () => userNameRef.current,
      transcribe: (audio) => transcribeRef.current?.(audio),
      ui: {
        status: setStatus,
        interim: setInterim,
        add,
        notice: (text) => add({ kind: 'error', text }),
        offline: () => setOnline(false),
        resolveConfirm: (confirmId, approved) =>
          setLog((items) => items.map((item) =>
            item.kind === 'confirm' && item.confirmId === confirmId ? { ...item, decided: approved ? 'Allowed' : 'Denied' } : item)),
        wakeFailed: () => setSettings((s) => ({ ...s, wake: false })),
      },
    })
    controller.current = azreal
    return () => azreal.dispose()
  }, [])

  // Summoning sequence: animation + sound, then hand over to the normal states
  useEffect(() => {
    if (!bootRun) return undefined
    stopBootSound.current = settingsRef.current.sfx ? playBootSound() : null
    const timer = setTimeout(() => {
      stopBootSound.current = null
      setBooting(false)
    }, BOOT_MS)
    return () => {
      clearTimeout(timer)
      stopBootSound.current?.()
      stopBootSound.current = null
    }
  }, [bootRun])

  // Small sound cues when Azreal starts listening or needs approval
  useEffect(() => {
    if (status === lastStatus.current) return
    lastStatus.current = status
    if (!settingsRef.current.sfx) return
    if (status === 'listening') playCue('listen')
    if (status === 'confirm') playCue('confirm')
  }, [status])

  // Check the core is running; keep checking so it connects as soon as it starts
  useEffect(() => {
    let alive = true
    let timer
    const check = async () => {
      try {
        const res = await fetch(`${CORE_URL}/health`, { signal: AbortSignal.timeout(2500) })
        if (alive) setOnline(res.ok)
      } catch {
        if (alive) setOnline(false)
      }
      if (alive) timer = setTimeout(check, 5000)
    }
    check()
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!window.speechSynthesis) return
    const load = () => setVoices(listVoices())
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [log.length, interim])

  // Space talks, Escape stops (only when not typing)
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') controller.current?.stopAll()
      const typing = event.target.closest?.('input, textarea, select, [contenteditable="true"]')
      if (event.code === 'Space' && !typing && !event.repeat) {
        event.preventDefault()
        if (bootingRef.current) skipBootRef.current?.()
        else controller.current?.tap()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function skipBoot() {
    stopBootSound.current?.()
    stopBootSound.current = null
    setBooting(false)
  }

  const replayBoot = () => {
    controller.current?.stopAll()
    setBooting(true)
    setBootRun((run) => run + 1)
  }

  const updateSetting = (key, value) => {
    const next = { ...settings, [key]: value }
    settingsRef.current = next
    setSettings(next)
    saveSetting(key, value)
    if (key === 'wake' || key === 'lang') controller.current?.settingsChanged()
    if (key === 'voice') controller.current?.preview('Voice updated, boss.')
    if (key === 'sfx' && !value) stopBootSound.current?.()
  }

  useEffect(() => {
    saveSetting('wake', settings.wake)
  }, [settings.wake])

  const submit = (event) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text || status === 'thinking') return
    setDraft('')
    controller.current?.send(text)
  }

  const clear = async () => {
    await controller.current?.reset()
    setLog([])
  }

  const isOffline = online === false

  return (
    <div className={`azreal-mode${booting ? ' is-booting' : ''}`} data-state={status}>
      <div className="azreal-stage">
        <button
          className="azreal-core"
          type="button"
          onClick={() => (booting ? skipBoot() : controller.current?.tap())}
          disabled={isOffline && !booting}
          aria-label={booting ? 'Skip intro' : status === 'listening' ? 'Stop listening' : status === 'speaking' ? 'Stop speaking' : 'Talk to Azreal'}
        >
          <AzrealDevil booting={booting} state={isOffline ? 'asleep' : status} />
        </button>
        {booting ? (
          <ol className="azreal-bootlog" aria-label="Summoning Azreal">
            {BOOT_LINES.map((line) => (
              <li key={line.text} style={{ animationDelay: `${line.at}s` }}>{line.text}</li>
            ))}
            <li className="is-online" style={{ animationDelay: '2.9s' }}>Azreal online</li>
          </ol>
        ) : (
          <>
            <p className="azreal-status" role="status">
              {isOffline ? 'Azreal core offline' : online === null ? 'Connecting…' : STATUS_LABELS[status]}
            </p>
            <p className="azreal-interim">{interim}</p>
          </>
        )}
      </div>

      {isOffline && (
        <div className="azreal-offline">
          <strong>The Azreal core isn&apos;t running.</strong>
          <span>
            It runs on your PC so Azreal can control it. Double-click <code>jarvis/start-jarvis.bat</code>, or run{' '}
            <code>npm start</code> inside the <code>jarvis</code> folder. This page connects automatically.
          </span>
        </div>
      )}

      <div className="azreal-log" aria-live="polite">
        {log.map((item) => {
          if (item.kind === 'actions') {
            return (
              <div className="azreal-actions" key={item.id}>
                {item.actions.map((action, index) => (
                  <span className={`azreal-action${action.ok ? '' : ' is-failed'}`} key={index} title={action.result}>
                    {action.ok ? '✓' : '✗'} {action.tool.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )
          }
          if (item.kind === 'confirm') {
            return (
              <div className="azreal-confirm" key={item.id}>
                <p>Allow Azreal to <code>{item.text}</code>?</p>
                {item.decided ? (
                  <span className="azreal-confirm-result">{item.decided}</span>
                ) : (
                  <div>
                    <button type="button" className="is-allow" onClick={() => controller.current?.decide(true)}>Allow</button>
                    <button type="button" onClick={() => controller.current?.decide(false)}>Deny</button>
                  </div>
                )}
              </div>
            )
          }
          return (
            <p className={`azreal-line is-${item.kind}`} key={item.id}>{item.text}</p>
          )
        })}
        <div ref={logEndRef} />
      </div>

      <form className="azreal-input" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="azreal-command">Command for Azreal</label>
        <input
          id="azreal-command"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={isOffline ? 'Start the Azreal core to give commands' : 'Type a command, or press Space to speak'}
          disabled={isOffline}
          autoComplete="off"
        />
        <button type="submit" disabled={isOffline || !draft.trim() || status === 'thinking'}>Send</button>
      </form>

      <div className="azreal-settings">
        <label>
          <input type="checkbox" checked={settings.convo} onChange={(e) => updateSetting('convo', e.target.checked)} />
          Conversation mode
        </label>
        <label title={hasSpeechRecognition ? 'Say "Azreal …" to start without clicking' : 'Needs Chrome or Edge'}>
          <input
            type="checkbox"
            checked={settings.wake}
            disabled={!hasSpeechRecognition}
            onChange={(e) => updateSetting('wake', e.target.checked)}
          />
          Wake word &ldquo;Azreal&rdquo;
        </label>
        <select value={settings.lang} onChange={(e) => updateSetting('lang', e.target.value)} aria-label="Listening language">
          <option value="en-IN">English (India)</option>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="hi-IN">Hindi</option>
        </select>
        <select value={settings.voice} onChange={(e) => updateSetting('voice', e.target.value)} aria-label="Voice">
          <option value="">Auto voice</option>
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>{voice.name.replace(/^Microsoft /, '').replace(/ Online \(Natural\)/, ' (Natural)')}</option>
          ))}
        </select>
        <label>
          <input type="checkbox" checked={settings.sfx} onChange={(e) => updateSetting('sfx', e.target.checked)} />
          Sound effects
        </label>
        <button type="button" onClick={replayBoot} disabled={booting}>Replay intro</button>
        <button type="button" onClick={clear} disabled={!log.length}>Clear</button>
      </div>
    </div>
  )
}

export default AzrealMode
