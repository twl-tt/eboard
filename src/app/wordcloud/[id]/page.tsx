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
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-600 to-indigo-800 p-5 font-han">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <h1 className="mb-1 text-center text-xl font-bold">{wordCloud?.title ?? "載入中…"}</h1>
        <p className="mb-5 text-center text-xs text-slate-400">校本智慧電子白板 · 詞雲</p>

        {!wordCloud && !error && <p className="py-8 text-center text-slate-400">連線中…</p>}
        {error && <p className="py-8 text-center text-red-500">{error}</p>}

        {wordCloud && (
          <>
            {wordCloud.isActive && (
              <div className="mb-5 flex gap-2">
                <input
                  type="text"
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submit() }}
                  placeholder={wordCloud.multiSubmit ? "輸入一個詞語，按 Enter 提交" : "輸入一個詞語，按 Enter 提交（只能提交一次）"}
                  disabled={busy || (!wordCloud.multiSubmit && submitted)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-lg focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800 disabled:opacity-50"
                />
                <button
                  onClick={submit}
                  disabled={busy || (!wordCloud.multiSubmit && submitted) || !word.trim()}
                  className="rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-5 py-2.5 font-bold text-white disabled:opacity-50"
                >
                  提交
                </button>
              </div>
            )}

            {!wordCloud.multiSubmit && submitted && (
              <p className="mb-4 text-center text-sm font-medium text-emerald-500">✓ 已提交！</p>
            )}
            {wordCloud.multiSubmit && submitted && (
              <p className="mb-4 text-center text-sm font-medium text-emerald-500">✓ 已提交！可以再提交更多詞語</p>
            )}

            {!wordCloud.isActive && (
              <p className="mb-4 text-center text-sm text-red-400">此詞雲已結束</p>
            )}

            {wordCloud.words.length > 0 ? (
              <div className="rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-5 min-h-[250px] dark:from-slate-800 dark:to-slate-900">
                <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
                  {wordCloud.words.map((entry, i) => {
                    const scale = 0.7 + (entry.count / maxCount) * 1.5
                    return (
                      <motion.span
                        key={entry.id}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                        className={`font-bold ${CLOUD_COLORS[i % CLOUD_COLORS.length]}`}
                        style={{
                          fontSize: `${scale}rem`,
                          textShadow: "0 1px 4px rgba(0,0,0,0.15)"
                        }}
                      >
                        {entry.text}
                      </motion.span>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[250px] rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
                <p className="text-sm text-slate-400">等待提交詞語…</p>
              </div>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">
              {wordCloud.words.length} 個詞 · 大家一起寫出課文的印象！
            </p>
          </>
        )}
      </div>
    </div>
  )
}
