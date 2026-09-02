let queued: SpeechSynthesisUtterance[] = []

function pickVoice(lang: "zh-HK" | "zh-TW"): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const norm = (l: string) => l.replace("_", "-").toLowerCase()
  const want = lang.toLowerCase()
  const exact = voices.find((v) => norm(v.lang) === want)
  if (exact) return exact
  const sameScript = lang === "zh-TW" ? ["zh-tw", "zh-hk", "zh-mo"] : ["zh-hk", "zh-mo", "zh-tw"]
  for (const pref of sameScript) {
    const v = voices.find((x) => norm(x.lang) === pref)
    if (v) return v
  }
  return voices.find((v) => norm(v.lang).startsWith("zh")) ?? null
}

export function stopSpeak() {
  window.speechSynthesis.cancel()
  queued = []
}

export function isSpeaking() {
  return window.speechSynthesis.speaking
}

export function speakSeq(
  items: { id: string; text: string }[],
  lang: "zh-HK" | "zh-TW",
  cb: { onStart?: (id: string) => void; onDone?: () => void }
) {
  stopSpeak()
  if (items.length === 0) {
    cb.onDone?.()
    return
  }
  const voice = pickVoice(lang)
  let i = 0
  const next = () => {
    if (i >= items.length) {
      cb.onStart?.("")
      cb.onDone?.()
      return
    }
    const it = items[i++]
    const u = new SpeechSynthesisUtterance(it.text.replace(/[\u3105-\u312f\u02d9\u02ca\u02c7\u02cb]/g, ""))
    if (voice) u.voice = voice
    u.lang = voice?.lang || lang
    u.rate = 0.92
    u.onstart = () => cb.onStart?.(it.id)
    u.onend = () => next()
    u.onerror = () => next()
    queued.push(u)
    window.speechSynthesis.speak(u)
  }
  next()
}

export function warmVoices() {
  window.speechSynthesis.getVoices()
}
