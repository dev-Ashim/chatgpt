// Sound effects for Azreal mode, synthesized with the Web Audio API (no audio files).

let ctx = null
let master = null
let noise = null

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    const compressor = ctx.createDynamicsCompressor()
    master = ctx.createGain()
    master.gain.value = 0.7
    master.connect(compressor)
    compressor.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

function noiseBuffer(c) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

// Attack/decay envelope on a gain node
function envelope(gain, start, attack, peak, decay) {
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + decay)
}

function tone(c, out, { type = 'sine', from, to = from, start, attack = 0.01, decay, peak, lowpass }) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, start)
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, start + attack + decay)
  let node = osc
  if (lowpass) {
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = lowpass
    osc.connect(filter)
    node = filter
  }
  node.connect(gain)
  gain.connect(out)
  envelope(gain, start, attack, peak, decay)
  osc.start(start)
  osc.stop(start + attack + decay + 0.05)
}

function hiss(c, out, { start, attack = 0.005, decay, peak, type = 'bandpass', from, to = from, q = 1 }) {
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  src.loop = true
  const filter = c.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, start)
  if (to !== from) filter.frequency.exponentialRampToValueAtTime(to, start + attack + decay)
  const gain = c.createGain()
  src.connect(filter)
  filter.connect(gain)
  gain.connect(out)
  envelope(gain, start, attack, peak, decay)
  src.start(start)
  src.stop(start + attack + decay + 0.05)
}

// The summoning sequence. Timings match the avatar's boot animation (~3.4s).
// Returns a function that fades it out early (skip / leaving the tab).
export function playBootSound() {
  const c = audio()
  if (!c) return () => {}
  const bus = c.createGain()
  bus.connect(master)
  const t = c.currentTime + 0.05

  // Low infernal rumble that swells while the avatar forms
  for (const f of [41, 41.6]) {
    tone(c, bus, { type: 'sawtooth', from: f, start: t, attack: 1.6, decay: 2.6, peak: 0.22, lowpass: 140 })
  }
  // Glitchy ticks while the skull is drawn
  for (let i = 0; i < 10; i++) {
    hiss(c, bus, { start: t + 0.7 + i * 0.085, decay: 0.03, peak: 0.22, from: 2200 + (i % 3) * 900, q: 6 })
  }
  // Whoosh as the horns rise
  hiss(c, bus, { start: t + 1.55, attack: 0.45, decay: 0.25, peak: 0.32, from: 250, to: 3500, q: 1.2 })
  // Riser into the ignition
  tone(c, bus, { type: 'sawtooth', from: 70, to: 220, start: t + 2.0, attack: 0.6, decay: 0.1, peak: 0.1, lowpass: 900 })
  // Ignition: sub boom, fire burst, and a dark dissonant chord
  tone(c, bus, { from: 140, to: 30, start: t + 2.7, decay: 1.4, peak: 0.9 })
  hiss(c, bus, { start: t + 2.7, decay: 0.6, peak: 0.45, type: 'lowpass', from: 1200, to: 200 })
  for (const f of [55, 58.3, 82.4]) {
    tone(c, bus, { type: 'sawtooth', from: f, start: t + 2.72, attack: 0.05, decay: 2.2, peak: 0.16, lowpass: 650 })
  }

  return () => {
    const now = c.currentTime
    bus.gain.cancelScheduledValues(now)
    bus.gain.setValueAtTime(bus.gain.value, now)
    bus.gain.linearRampToValueAtTime(0, now + 0.15)
    setTimeout(() => bus.disconnect(), 300)
  }
}

// Short cues for state changes
export function playCue(name) {
  const c = audio()
  if (!c) return
  const t = c.currentTime + 0.01
  if (name === 'listen') {
    tone(c, master, { type: 'triangle', from: 420, to: 840, start: t, attack: 0.02, decay: 0.16, peak: 0.12 })
  } else if (name === 'confirm') {
    tone(c, master, { type: 'triangle', from: 392, start: t, decay: 0.18, peak: 0.12 })
    tone(c, master, { type: 'triangle', from: 294, start: t + 0.16, decay: 0.26, peak: 0.12 })
  } else if (name === 'done') {
    tone(c, master, { type: 'sine', from: 180, to: 90, start: t, decay: 0.25, peak: 0.12 })
  }
}
