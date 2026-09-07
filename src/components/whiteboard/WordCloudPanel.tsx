"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { motion } from "framer-motion"
import { Cloud, QrCode, Plus, Square, Trash2, Monitor, Pencil, X } from "lucide-react"
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
  multiSubmit: boolean
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
  const [newMulti, setNewMulti] = useState(true)
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
      body: JSON.stringify({ title: newTitle.trim(), multiSubmit: newMulti })
    })
    if (res.ok) {
      const wc: WordCloud = await res.json()
      setShowCreate(false)
      setNewTitle("")
      setNewMulti(true)
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
            onChange={(e) => {
              const found = wordClouds.find((w) => w.id === e.target.value)
              if (found) setActiveCloud(found)
            }}
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
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={newMulti}
                onChange={(e) => setNewMulti(e.target.checked)}
                className="rounded border-slate-300"
              />
              允許重複提交
            </label>
          </div>
          <Button onClick={create}>建立詞雲</Button>
        </div>
      )}

      {activeCloud ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-white p-3 shadow">
            <QRCodeSVG key={`qr-${activeCloud.id}`} value={`${typeof window !== "undefined" ? window.location.origin : ""}/wordcloud/${activeCloud.id}`} size={150} />
          </div>
          <p className="text-center text-sm font-medium">{activeCloud.title}</p>

          {activeCloud.words && activeCloud.words.length > 0 ? (
            <div className="w-full rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-800 dark:to-slate-900 min-h-[350px] flex flex-wrap content-start gap-2">
              {activeCloud.words.map((entry, i) => {
                const scale = 0.8 + (entry.count / maxCount) * 1.2
                return (
                  <div
                    key={entry.id}
                    className="relative flex flex-col items-center justify-center rounded-lg bg-white/80 px-4 py-2 shadow-sm dark:bg-slate-700/80"
                  >
                    <span
                      className={`font-bold ${CLOUD_COLORS[i % CLOUD_COLORS.length]}`}
                      style={{
                        fontSize: `${scale}rem`,
                        textShadow: "0 1px 2px rgba(0,0,0,0.1)"
                      }}
                    >
                      {entry.text}
                    </span>
                    {entry.count > 1 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow">
                        {entry.count}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center w-full min-h-[350px] rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              <p className="text-xl text-slate-400">等待學生提交…</p>
            </div>
          )}

          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate-400">{activeCloud.words.length} 個詞</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(`/wordcloud/${activeCloud.id}`, "_blank")}
                className="h-8 w-8"
                title="學生提交頁面"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(`/wordcloud/display/${activeCloud.id}`, "_blank")}
                className="h-8 w-8"
                title="大屏幕顯示"
              >
                <Monitor className="h-4 w-4" />
              </Button>
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
