"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { motion } from "framer-motion"
import { Cloud, QrCode, Plus, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

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
  createdAt: string
}

const CLOUD_COLORS = [
  "text-sky-500", "text-violet-500", "text-emerald-500", "text-amber-500",
  "text-rose-500", "text-cyan-500", "text-fuchsia-500", "text-orange-500",
  "text-indigo-500", "text-pink-500"
]

export function WordCloudPanel() {
  const [wordClouds, setWordClouds] = useState<WordCloud[]>([])
  const [activeCloud, setActiveCloud] = useState<WordCloud | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const timerRef = useRef<number | null>(null)

  const loadList = useCallback(async () => {
    const res = await fetch("/api/classroom/wordcloud")
    if (!res.ok) return
    const data: WordCloud[] = await res.json()
    setWordClouds(data)
    setActiveCloud((prev) =>
      prev ? data.find((w) => w.id === prev.id) ?? null
        : data.find((w) => w.isActive) ?? data[0] ?? null
    )
  }, [])

  useEffect(() => {
    loadList()
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [loadList])

  useEffect(() => {
    if (!activeCloud) return
    timerRef.current = window.setInterval(async () => {
      const res = await fetch(`/api/classroom/wordcloud/${activeCloud.id}`)
      if (res.ok) {
        const fresh: WordCloud = await res.json()
        setActiveCloud(fresh)
        setWordClouds((prev) => prev.map((w) => (w.id === fresh.id ? fresh : w)))
      }
    }, 2000)
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeCloud?.id])

  async function create() {
    if (!newTitle.trim()) return
    const res = await fetch("/api/classroom/wordcloud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() })
    })
    if (res.ok) {
      const wc: WordCloud = await res.json()
      setShowCreate(false)
      setNewTitle("")
      setActiveCloud(wc)
      loadList()
    }
  }

  async function closeCloud(id: string) {
    await fetch(`/api/classroom/wordcloud/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false })
    })
    loadList()
  }

  async function deleteCloud(id: string) {
    if (!confirm("確定刪除？")) return
    await fetch(`/api/classroom/wordcloud/${id}`, { method: "DELETE" })
    if (activeCloud?.id === id) setActiveCloud(null)
    loadList()
  }

  const maxCount = activeCloud?.words.reduce((max, w) => Math.max(max, w.count), 1) ?? 1

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" /> 新增詞雲
        </Button>
        {wordClouds.length > 0 && (
          <select
            value={activeCloud?.id ?? ""}
            onChange={(e) => setActiveCloud(wordClouds.find((w) => w.id === e.target.value) ?? null)}
            className="h-8 flex-1 rounded-lg border border-slate-300 bg-transparent px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
          >
            {wordClouds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.isActive ? "🟢" : "⚪"} {w.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {showCreate && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <Input placeholder="詞雲主題，例如：你對課文的印象？" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          <Button onClick={create}>建立詞雲</Button>
        </div>
      )}

      {activeCloud ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-white p-3 shadow">
            <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/wordcloud/${activeCloud.id}`} size={150} />
          </div>
          <p className="text-center text-sm font-medium">{activeCloud.title}</p>

          {activeCloud.words && activeCloud.words.length > 0 ? (
            <div className="relative w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-800 dark:to-slate-900 min-h-[200px]">
              <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5">
                {activeCloud.words.map((entry, i) => {
                  const scale = 0.6 + (entry.count / maxCount) * 1.4
                  return (
                    <motion.span
                      key={entry.id}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      className={`font-bold cursor-default ${CLOUD_COLORS[i % CLOUD_COLORS.length]}`}
                      style={{
                        fontSize: `${scale}rem`,
                        textShadow: "0 1px 3px rgba(0,0,0,0.1)"
                      }}
                      title={`${entry.text}: ${entry.count} 次`}
                    >
                      {entry.text}
                    </motion.span>
                  )
                })}
              </div>
              {activeCloud.words.length === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">等待學生提交…</p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full min-h-[200px] rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              <p className="text-sm text-slate-400">等待學生提交…</p>
            </div>
          )}

          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate-400">{activeCloud.words.length} 個詞</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => deleteCloud(activeCloud.id)} className="h-8 w-8 text-red-500">
                <Trash2 className="h-4 w-4" />
              </Button>
              {activeCloud.isActive ? (
                <Button variant="destructive" size="sm" onClick={() => closeCloud(activeCloud.id)}>
                  <Square className="h-4 w-4" /> 結束
                </Button>
              ) : (
                <span className="flex items-center gap-1 text-xs text-slate-400"><Cloud className="h-4 w-4" /> 已結束</span>
              )}
            </div>
          </div>
          <p className="flex items-center gap-1 text-xs text-slate-400"><QrCode className="h-4 w-4" /> 學生掃描 QR Code 即可提交詞語</p>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">尚未有詞雲。點擊「新增詞雲」開始！</p>
      )}
    </div>
  )
}
