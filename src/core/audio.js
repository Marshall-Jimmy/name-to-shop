// Web Audio 合成音效（零音频文件，全部振荡器实时合成）
let actx = null
let master = null
let flyOsc = null
let flyGain = null
let muted = false

export function ensureAudio() {
  if (actx) {
    if (actx.state === 'suspended') actx.resume()
    return actx
  }
  actx = new (window.AudioContext || window.webkitAudioContext)()
  master = actx.createGain()
  master.gain.value = 0.32
  master.connect(actx.destination)
  return actx
}

export function setMuted(m) {
  muted = m
  if (master) master.gain.value = m ? 0 : 0.32
}

export function isMuted() { return muted }

function tone({ freq = 440, freq2 = null, dur = 0.15, type = 'sine', vol = 0.5, delay = 0, attack = 0.005 }) {
  if (!actx || muted) return
  const t0 = actx.currentTime + delay
  const osc = actx.createOscillator()
  const g = actx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(vol, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(g); g.connect(master)
  osc.start(t0); osc.stop(t0 + dur + 0.02)
}

function noise({ dur = 0.3, vol = 0.3, from = 400, to = 2000, delay = 0 }) {
  if (!actx || muted) return
  const t0 = actx.currentTime + delay
  const len = Math.floor(actx.sampleRate * dur)
  const buf = actx.createBuffer(1, len, actx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) data[i] = (i / len * 2 - 1) * (1 - i / len)
  const src = actx.createBufferSource()
  src.buffer = buf
  const filter = actx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(from, t0)
  filter.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  filter.Q.value = 1.2
  const g = actx.createGain()
  g.gain.setValueAtTime(vol, t0)
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  src.connect(filter); filter.connect(g); g.connect(master)
  src.start(t0)
}

export function sfx(kind) {
  if (!actx) return
  switch (kind) {
    case 'click':
      tone({ freq: 720, freq2: 480, dur: 0.09, type: 'triangle', vol: 0.4 })
      break
    case 'type':
      tone({ freq: 1400 + (performance.now() % 7) * 90, freq2: 900, dur: 0.045, type: 'square', vol: 0.16 })
      break
    case 'hover':
      tone({ freq: 2200, dur: 0.03, type: 'sine', vol: 0.07 })
      break
    case 'open': // 开业 / 生成
      tone({ freq: 523, dur: 0.12, type: 'triangle', vol: 0.4 })
      tone({ freq: 659, dur: 0.12, type: 'triangle', vol: 0.4, delay: 0.09 })
      tone({ freq: 784, dur: 0.2, type: 'triangle', vol: 0.42, delay: 0.18 })
      tone({ freq: 1047, dur: 0.34, type: 'sine', vol: 0.36, delay: 0.27 })
      break
    case 'enter': // 进门风铃
      tone({ freq: 1319, dur: 0.4, type: 'sine', vol: 0.3 })
      tone({ freq: 1760, dur: 0.5, type: 'sine', vol: 0.24, delay: 0.07 })
      tone({ freq: 2093, dur: 0.6, type: 'sine', vol: 0.18, delay: 0.14 })
      break
    case 'whoosh':
      noise({ dur: 0.5, vol: 0.35, from: 300, to: 2400 })
      break
    case 'flyUp':
      tone({ freq: 180, freq2: 640, dur: 0.9, type: 'sawtooth', vol: 0.2 })
      noise({ dur: 1.1, vol: 0.25, from: 200, to: 1800 })
      break
    case 'flyDown':
      tone({ freq: 640, freq2: 160, dur: 0.9, type: 'sawtooth', vol: 0.2 })
      noise({ dur: 1.1, vol: 0.22, from: 1600, to: 200 })
      break
    case 'sparkle':
      tone({ freq: 1568, dur: 0.1, type: 'sine', vol: 0.3 })
      tone({ freq: 2093, dur: 0.1, type: 'sine', vol: 0.3, delay: 0.07 })
      tone({ freq: 2637, dur: 0.16, type: 'sine', vol: 0.3, delay: 0.14 })
      break
    case 'error':
      tone({ freq: 200, freq2: 140, dur: 0.2, type: 'square', vol: 0.22 })
      break
    case 'camera':
      tone({ freq: 1200, freq2: 700, dur: 0.06, type: 'square', vol: 0.2 })
      noise({ dur: 0.08, vol: 0.15, from: 2000, to: 800 })
      break
    case 'egg':
      tone({ freq: 880, dur: 0.14, type: 'triangle', vol: 0.35 })
      tone({ freq: 1109, dur: 0.14, type: 'triangle', vol: 0.35, delay: 0.1 })
      tone({ freq: 1319, dur: 0.14, type: 'triangle', vol: 0.35, delay: 0.2 })
      tone({ freq: 1760, dur: 0.3, type: 'sine', vol: 0.35, delay: 0.3 })
      break
  }
}

export function flyHum(on) {
  if (!actx) return
  if (on && !flyOsc) {
    flyOsc = actx.createOscillator()
    flyGain = actx.createGain()
    const lfo = actx.createOscillator()
    const lfoGain = actx.createGain()
    flyOsc.type = 'sawtooth'
    flyOsc.frequency.value = 72
    lfo.frequency.value = 11
    lfoGain.gain.value = 9
    lfo.connect(lfoGain); lfoGain.connect(flyOsc.frequency)
    const filter = actx.createBiquadFilter()
    filter.type = 'lowpass'; filter.frequency.value = 320
    flyGain.gain.setValueAtTime(0, actx.currentTime)
    flyGain.gain.linearRampToValueAtTime(muted ? 0 : 0.16, actx.currentTime + 0.8)
    flyOsc.connect(filter); filter.connect(flyGain); flyGain.connect(master)
    flyOsc.start(); lfo.start()
    flyOsc._lfo = lfo
  } else if (!on && flyOsc) {
    flyGain.gain.linearRampToValueAtTime(0, actx.currentTime + 0.6)
    const o = flyOsc, l = flyOsc._lfo
    setTimeout(() => { try { o.stop(); l.stop() } catch { } }, 700)
    flyOsc = null
  }
}
