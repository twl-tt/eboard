"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"

interface WordCloudEntry {
  id: string
  text: string
  count: number
}

interface WordCloud {
  id: string
  title: string
  words: WordCloudEntry[]
  isActive: boolean
  multiSubmit: boolean
}

export default function WordCloudVotePage({ params }: { params: { id: string } }) {
  const [wordCloud, setWordCloud] = useState<WordCloud | null>(null)
  const [word, setWord] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/classroom/wordcloud/${params.id}`)
      if (!res.ok) throw new Error("找不到此詞雲")
      setWordCloud(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [params.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    try {
      if (localStorage.getItem(`wrp-wc-${params.id}`)) setSubmitted(true)
    } catch {}
  }, [params.id])

  useEffect(() => {
    if (!wordCloud) return
    const t = setInterval(() => {
      fetch(`/api/classroom/wordcloud/${params.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((w: WordCloud | null) => w && setWordCloud(w))
        .catch(() => {})
    }, 2000)
    return () => clearInterval(t)
  }, [wordCloud?.id, params.id])

  async function submit() {
    if (!wordCloud?.isActive || busy) return
    if (!wordCloud.multiSubmit && submitted) return
    const text = word.trim()
    if (!text) return
    setBusy(true)
    try {
      const res = await fetch(`/api/classroom/wordcloud/${wordCloud.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: text })
      })
      if (!res.ok) throw new Error("提交失敗")
      setWord("")
      if (!wordCloud.multiSubmit) {
        setSubmitted(true)
        try {
          localStorage.setItem(`wrp-wc-${wordCloud.id}`, "1")
        } catch {}
      }
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const maxCount = wordCloud?.words.reduce((max, w) => Math.max(max, w.count), 1) ?? 1

  const CLOUD_COLORS = [
    "text-sky-400", "text-violet-400", "text-emerald-400", "text-amber-400",
    "text-rose-400", "text-cyan-400", "text-fuchsia-400", "text-orange-400",
    "text-indigo-400", "text-pink-400"
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-600 to-indigo-800 p-4 font-han">
      <div className="max-w-6xl mx-auto">
        <h1 className="mb-2 text-center text-3xl font-bold text-white">{wordCloud?.title ?? "載入中…"}</h1>
        <p className="mb-6 text-center text-sm text-white/60">校本智慧電子白板 · 詞雲</p>

        {!wordCloud && !error && <p className="py-8 text-center text-white/60">連線中…</p>}
        {error && <p className="py-8 text-center text-red-400">{error}</p>}

        {wordCloud && (
          <>
            {wordCloud.isActive && (
              <div className="mb-8 flex gap-4 justify-center">
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit() }}
                  placeholder={wordCloud.multiSubmit ? "輸入一個詞語，按 Enter 提交" : "輸入一個詞語，按 Enter 提交（只能提交一次）"}
                  disabled={busy || (!wordCloud.multiSubmit && submitted)}
                  className="w-full max-w-2xl rounded-2xl border-2 border-white/30 bg-white/95 px-8 py-5 text-2xl font-bold focus:outline-none focus:ring-4 focus:ring-sky-400 disabled:opacity-50"
                />
                <button
                  onClick={submit}
                  disabled={busy || (!wordCloud.multiSubmit && submitted) || !word.trim()}
                  className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-10 py-5 text-xl font-bold text-white disabled:opacity-50"
                >
                  提交
                </button>
              </div>
            )}

            {!wordCloud.multiSubmit && submitted && (
              <p className="mb-6 text-center text-xl font-medium text-emerald-300">✓ 已提交！</p>
            )}
            {wordCloud.multiSubmit && submitted && (
              <p className="mb-6 text-center text-xl font-medium text-emerald-300">✓ 已提交！可以再提交更多詞語</p>
            )}

            {!wordCloud.isActive && (
              <p className="mb-6 text-center text-xl text-red-300">此詞雲已結束</p>
            )}

            {wordCloud.words.length > 0 ? (
              <div className="rounded-3xl bg-black/20 p-8 min-h-[400px]" style={{ columnCount: 4, columnGap: "2rem" }}>
                {wordCloud.words.map((entry, i) => {
                  const scale = 1.5 + (entry.count / maxCount) * 3
                  return (
                    <motion.span
                      key={entry.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className={`font-black ${CLOUD_COLORS[i % CLOUD_COLORS.length]}`}
                      style={{
                        fontSize: `${scale}rem`,
                        textShadow: "0 2px 10px rgba(0,0,0,0.3)",
                        display: "inline-block",
                        width: "100%",
                        marginBottom: "1rem"
                      }}
                    >
                      {entry.text}
                    </motion.span>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[400px] rounded-3xl bg-black/20">
                <p className="text-2xl text-white/50">等待提交詞語…</p>
              </div>
            )}

            <p className="mt-6 text-center text-lg text-white/60">
              {wordCloud.words.length} 個詞 · 大家一起寫出課文的印象！
            </p>
          </>
        )}
      </div>
    </div>
  )
}
