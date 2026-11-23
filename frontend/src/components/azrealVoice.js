// Voice loop for Azreal mode: listen -> send to the local Azreal core -> speak.
// Kept outside React because listen/speak/confirm all call each other.

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

const YES = /\b(yes|yeah|yep|yup|haan|han|ha|ok|okay|sure|do it|go ahead|proceed|confirm|allow|kar do|karo)\b/i
const NO = /\b(no|nope|nah|nahi|nahin|cancel|stop|deny|don't|dont|mat)\b/i
const WAKE = /\b(azreal|azrael|azriel|israel|as real|ajrael)\b[\s,.!]*/i
const MALE = /(Guy|Ryan|Prabhat|Christopher|Eric|Andrew|Brian|Thomas|Daniel|George|Ravi|Male)/i

export const hasSpeechRecognition = Boolean(SR)

export function listVoices() {
  return synth ? synth.getVoices().filter((v) => /^(en|hi)/i.test(v.lang)) : []
}

function pickVoice(name) {
  const voices = listVoices()
  if (name) {
    const chosen = voices.find((v) => v.name === name)
    if (chosen) return chosen
  }
  return voices.find((v) => /Natural/i.test(v.name) && /^en-(GB|IN|US)/.test(v.lang) && MALE.test(v.name))
    || voices.find((v) => /^en-GB/.test(v.lang) && MALE.test(v.name))
    || voices.find((v) => /^en/.test(v.lang) && MALE.test(v.name))
    || voices.find((v) => /^en/.test(v.lang))
    || null
}

export function createAzreal({ coreUrl, ui, getSettings, getUserName, transcribe }) {
  let status = 'asleep'
  let pending = null
  let rec = null
  let wakeRec = null
  let recorder = null
  let cancelRecording = false
  let disposed = false
  // Brave and some browsers expose SpeechRecognition but it fails; then we record + Whisper
  let useRecorder = !SR

  const setStatus = (s) => {
    status = s
    ui.status(s)
  }
  const rest = () => setStatus(pending ? 'confirm' : 'idle')

  async function api(path, body) {
    const res = await fetch(coreUrl + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Jarvis': '1' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Azreal core error ${res.status}`)
    return data
  }

  // ---------- speaking ----------
  function speak(text, done) {
    if (!synth) return done?.()
    synth.cancel()
    const clean = String(text).replace(/[*_#`>]/g, '').replace(/https?:\/\/\S+/g, 'the link').trim()
    // Chromium cuts off long utterances, so speak sentence-sized chunks
    const chunks = clean.match(/[^.!?\n]+[.!?]*|\n/g)?.map((c) => c.trim()).filter(Boolean) || []
    if (!chunks.length) return done?.()
    setStatus('speaking')
    const voice = pickVoice(getSettings().voice)
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk)
      if (voice) u.voice = voice
      u.rate = 1.05
      u.pitch = 0.9
      if (i === chunks.length - 1) {
        u.onend = u.onerror = () => {
          if (disposed) return
          if (status === 'speaking') rest()
          done?.()
        }
      }
      synth.speak(u)
    })
  }

  // ---------- listening ----------
  function listen() {
    if (disposed) return
    stopWake()
    synth?.cancel()
    if (useRecorder) return listenWithRecorder()

    let finalText = ''
    let switchToRecorder = false
    rec = new SR()
    rec.lang = getSettings().lang
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let interim = ''
      for (const r of e.results) {
        if (r.isFinal) finalText = r[0].transcript
        else interim += r[0].transcript
      }
      ui.interim(interim || finalText)
    }
    rec.onerror = (e) => {
      if (['network', 'service-not-allowed', 'language-not-supported'].includes(e.error) && transcribe) {
        useRecorder = true
        switchToRecorder = true
      } else if (e.error === 'not-allowed') {
        ui.notice('Microphone is blocked. Allow it from the address bar.')
      }
    }
    rec.onend = () => {
      rec = null
      ui.interim('')
      if (disposed) return
      if (switchToRecorder) return listenWithRecorder()
      if (finalText.trim()) return handle(finalText.trim())
      if (status === 'listening') rest()
      startWake()
    }
    try {
      rec.start()
      setStatus('listening')
    } catch {
      rec = null
      rest()
    }
  }

  // Fallback: record audio, stop after ~1.3s of silence, transcribe on the AZREAL backend
  async function listenWithRecorder() {
    if (!transcribe || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      ui.notice('Voice input is not supported in this browser. Type your command instead.')
      return rest()
    }
    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      ui.notice('Microphone is blocked. Allow it from the address bar.')
      return rest()
    }
    if (disposed) return stream.getTracks().forEach((t) => t.stop())

    const chunks = []
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 1024
    ctx.createMediaStreamSource(stream).connect(analyser)
    const samples = new Uint8Array(analyser.fftSize)
    const startedAt = performance.now()
    let quietSince = startedAt
    let heard = false

    cancelRecording = false
    recorder = new MediaRecorder(stream)
    const timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples)
      let peak = 0
      for (const v of samples) peak = Math.max(peak, Math.abs(v - 128))
      const now = performance.now()
      if (peak > 12) {
        heard = true
        quietSince = now
      }
      const done = (heard && now - quietSince > 1300) || (!heard && now - startedAt > 7000) || now - startedAt > 30000
      if (done && recorder?.state === 'recording') recorder.stop()
    }, 100)

    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = async () => {
      clearInterval(timer)
      stream.getTracks().forEach((t) => t.stop())
      ctx.close()
      const type = recorder?.mimeType || 'audio/webm'
      recorder = null
      if (disposed) return
      if (cancelRecording || !heard || !chunks.length) return rest()
      ui.interim('Transcribing…')
      setStatus('thinking')
      try {
        const text = (await transcribe(new Blob(chunks, { type })))?.trim()
        ui.interim('')
        if (text) handle(text)
        else rest()
      } catch (err) {
        ui.interim('')
        ui.notice(err.message)
        rest()
      }
    }
    recorder.start()
    setStatus('listening')
  }

  function stopListening() {
    rec?.stop()
    if (recorder?.state === 'recording') recorder.stop()
  }

  // ---------- wake word ----------
  function startWake() {
    if (disposed || !getSettings().wake || !SR || useRecorder || wakeRec) return
    if (status !== 'idle' && status !== 'asleep') return
    wakeRec = new SR()
    wakeRec.lang = getSettings().lang
    wakeRec.continuous = true
    wakeRec.interimResults = false
    wakeRec.onresult = (e) => {
      const said = e.results[e.results.length - 1][0].transcript
      const match = said.match(WAKE)
      if (!match) return
      const command = said.slice(match.index + match[0].length).trim()
      stopWake()
      if (command.split(/\s+/).length >= 2) handle(command)
      else speak('Yes, boss?', listen)
    }
    wakeRec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'network') ui.wakeFailed()
    }
    wakeRec.onend = () => {
      wakeRec = null
      setTimeout(startWake, 400)
    }
    try {
      wakeRec.start()
    } catch {
      wakeRec = null
    }
  }

  function stopWake() {
    if (!wakeRec) return
    const r = wakeRec
    wakeRec = null
    r.onend = null
    r.abort()
  }

  // ---------- conversation ----------
  async function handle(text) {
    ui.add({ kind: 'user', text })
    if (pending) {
      if (NO.test(text)) return decide(false)
      if (YES.test(text)) return decide(true)
      return speak('Just say yes or no, boss.', listen)
    }
    setStatus('thinking')
    try {
      show(await api('/api/chat', { message: text, userName: getUserName() }))
    } catch (err) {
      fail(err)
    }
  }

  async function decide(approve) {
    if (!pending) return
    const { id } = pending
    pending = null
    synth?.cancel()
    rec?.abort()
    ui.resolveConfirm(id, approve)
    setStatus('thinking')
    try {
      show(await api('/api/confirm', { id, approve }))
    } catch (err) {
      fail(err)
    }
  }

  function show(res) {
    if (disposed) return
    if (res.actions?.length) ui.add({ kind: 'actions', actions: res.actions })
    if (res.confirm) {
      pending = res.confirm
      ui.add({ kind: 'confirm', confirmId: res.confirm.id, text: res.confirm.text })
      setStatus('confirm')
      speak(res.confirm.say, () => {
        if (pending) {
          setStatus('confirm')
          listen()
        }
      })
      return
    }
    ui.add({ kind: 'azreal', text: res.reply })
    speak(res.reply, () => (getSettings().convo ? listen() : startWake()))
  }

  function fail(err) {
    if (disposed) return
    const offline = err instanceof TypeError
    if (offline) ui.offline()
    ui.add({ kind: 'error', text: offline ? 'Azreal core is not reachable.' : err.message })
    rest()
    speak('Something went wrong, boss.', startWake)
  }

  function stopAll() {
    synth?.cancel()
    rec?.abort()
    if (recorder?.state === 'recording') {
      cancelRecording = true
      recorder.stop()
    }
    if (['speaking', 'listening'].includes(status)) rest()
  }

  // Timers and reminders pushed from the core
  const events = new EventSource(coreUrl + '/api/events')
  events.onmessage = (m) => {
    try {
      const e = JSON.parse(m.data)
      if (e.type === 'reminder') {
        ui.add({ kind: 'azreal', text: '⏰ ' + e.text })
        speak('Reminder, boss. ' + e.text, startWake)
      }
    } catch {
      // ignore malformed events
    }
  }

  setStatus('asleep')
  startWake()

  return {
    // The core button: wake up, talk, interrupt, or stop listening
    tap() {
      if (status === 'asleep') {
        const first = (getUserName() || '').split(/\s+/)[0]
        speak(`Azreal online. What do you need${first ? ', ' + first : ''}?`, listen)
      } else if (status === 'speaking') {
        synth?.cancel()
        rest()
      } else if (status === 'listening') {
        stopListening()
      } else if (status !== 'thinking') {
        listen()
      }
    },
    send(text) {
      if (status === 'thinking') return
      stopAll()
      handle(text)
    },
    decide,
    stopAll,
    settingsChanged() {
      stopWake()
      startWake()
    },
    preview(text) {
      speak(text)
    },
    async reset() {
      stopAll()
      pending = null
      await api('/api/reset', {}).catch(() => {})
      setStatus('asleep')
    },
    dispose() {
      disposed = true
      stopAll()
      stopWake()
      events.close()
    },
  }
}
