import confetti from "canvas-confetti"

export function celebrate(x = 0.5, y = 0.5) {
  confetti({
    particleCount: 120,
    spread: 75,
    origin: { x, y },
    colors: ["#fbbf24", "#f472b6", "#60a5fa", "#34d399", "#a78bfa"]
  })
}

let audioCtx: AudioContext | null = null

export function tick() {
  playTone(880, 0.04, 0.03)
}

export function ding() {
  playTone(660, 0.12, 0.18)
  setTimeout(() => playTone(990, 0.12, 0.22), 110)
  setTimeout(() => playTone(1320, 0.16, 0.25), 230)
}

function playTone(freq: number, gainVal: number, dur: number) {
  try {
    audioCtx = audioCtx ?? new AudioContext()
    const osc = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    osc.frequency.value = freq
    osc.type = "sine"
    g.gain.setValueAtTime(gainVal, audioCtx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur)
    osc.connect(g).connect(audioCtx.destination)
    osc.start()
    osc.stop(audioCtx.currentTime + dur)
  } catch {}
}
