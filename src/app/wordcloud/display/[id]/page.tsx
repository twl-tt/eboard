"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { QRCodeSVG } from "qrcode.react"
import { ExternalLink } from "lucide-react"

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

const CLOUD_COLORS = [
  "text-sky-300", "text-violet-300", "text-emerald-300", "text-amber-300",
  "text-rose-300", "text-cyan-300", "text-fuchsia-300", "text-orange-300",
  "text-indigo-300", "text-pink-300"
]

export default function WordCloudDisplayPage({ params }: { params: { id: string } }) {
  const [wordCloud, setWordCloud] = useState<WordCloud | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/classroom/wordcloud/${params.id}`)
      if (!res.ok) throw new Error("找不到此詞牆")
      setWordCloud(await res.json())
    } catch (e) {
      console.error(e)
    }
  }, [params.id])

  useEffect(() => {
    load()
    const t = setInterval(load, 2000)
    return () => clearInterval(t)
  }, [load])

  if (!wordCloud) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-sky-600 to-indigo-800 flex items-center justify-center">
        <p className="text-4xl text-white/60">載入中…</p>
      </div>
    )
  }

  const maxCount = wordCloud.words.reduce((max, w) => Math.max(max, w.count), 1) ?? 1

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-sky-600 to-indigo-800 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-5 bg-black/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-bold text-white">📺 大屏幕顯示</span>
          <h1 className="text-2xl font-bold text-white">{wordCloud.title}</h1>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-lg text-white/70">{wordCloud.words.length} 個詞</span>
          {wordCloud.isActive && (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/70">LIVE</span>
            </span>
          )}
          <div className="rounded-lg bg-white p-2">
            <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/wordcloud/${wordCloud.id}`} size={80} />
          </div>
          <a
            href={`/wordcloud/${wordCloud.id}`}
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-white hover:bg-white/30 transition"
          >
            <ExternalLink className="w-5 h-5" />
            學生提交
          </a>
        </div>
      </div>

      {/* Word Cloud Display - Full Screen */}
      <div className="absolute inset-0 pt-24 pb-4 overflow-auto">
        {wordCloud.words.length > 0 ? (
          <div className="w-full p-8 flex flex-wrap justify-center items-center gap-4 content-start">
            {wordCloud.words.map((entry, i) => {
              const scale = 1 + (entry.count / maxCount) * 1.5
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  className="relative flex flex-col items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm px-8 py-5"
                  style={{
                    minWidth: `${Math.max(6, entry.text.length * 2)}rem`
                  }}
                >
                  <span
                    className={`font-black text-white ${CLOUD_COLORS[i % CLOUD_COLORS.length].replace("300", "100")}`}
                    style={{
                      fontSize: `${scale}rem`,
                      lineHeight: 1.2,
                      textShadow: "0 2px 10px rgba(0,0,0,0.3)"
                    }}
                  >
                    {entry.text}
                  </span>
                  {entry.count > 1 && (
                    <span className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-lg">
                      {entry.count}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-6xl text-white/40">等待學生提交…</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 left-0 right-0 z-20 px-8 py-4 bg-black/20 backdrop-blur-sm">
        <p className="text-center text-white/50">
          請學生到 <span className="font-mono text-white/70">/{wordCloud.id}</span> 提交詞語
        </p>
      </div>
    </div>
  )
}
