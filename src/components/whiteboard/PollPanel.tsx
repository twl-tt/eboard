"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { motion } from "framer-motion"
import { BarChart3, QrCode, Plus, Square } from "lucide-react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Textarea, Label } from "@/components/ui/input"
import type { PollDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

const BAR_COLORS = ["bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-emerald-500", "bg-rose-500", "bg-cyan-500"]

export function PollPanel() {
  const [polls, setPolls] = useState<PollDTO[]>([])
  const [activePoll, setActivePoll] = useState<PollDTO | null>(null)
  const [question, setQuestion] = useState("")
  const [optionsText, setOptionsText] = useState("同意\n不同意")
  const [showCreate, setShowCreate] = useState(false)
  const timerRef = useRef<number | null>(null)

  const loadList = useCallback(async () => {
    const res = await fetch("/api/classroom/polls")
    if (!res.ok) return
    const data: PollDTO[] = await res.json()
    setPolls(data)
    setActivePoll((prev) => (prev ? data.find((p) => p.id === prev.id) ?? data[0] ?? null : data.find((p) => p.isActive) ?? data[0] ?? null))
  }, [])

  useEffect(() => {
    loadList()
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [loadList])

  useEffect(() => {
    if (!activePoll) return
    timerRef.current = window.setInterval(async () => {
      const res = await fetch(`/api/classroom/polls/${activePoll.id}`)
      if (res.ok) {
        const fresh: PollDTO = await res.json()
        setActivePoll(fresh)
        setPolls((ps) => ps.map((p) => (p.id === fresh.id ? fresh : p)))
      }
    }, 2000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [activePoll?.id])

  async function create() {
    const options = optionsText.split("\n").map((o) => o.trim()).filter(Boolean)
    if (!question.trim() || options.length < 2) return
    const res = await fetch("/api/classroom/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: question.trim(), options })
    })
    if (res.ok) {
      const poll: PollDTO = await res.json()
      setShowCreate(false)
      setQuestion("")
      setActivePoll(poll)
      loadList()
    }
  }

  async function closePoll(id: string) {
    await fetch(`/api/classroom/polls/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false })
    })
    loadList()
  }

  const totalVotes = activePoll?.options.reduce((sum, o) => sum + o.votes, 0) ?? 0

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-4 w-4" /> 新增投票
        </Button>
        {polls.length > 0 && (
          <select
            value={activePoll?.id ?? ""}
            onChange={(e) => setActivePoll(polls.find((p) => p.id === e.target.value) ?? null)}
            className="h-8 flex-1 rounded-lg border border-slate-300 bg-transparent px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
          >
            {polls.map((p) => (
              <option key={p.id} value={p.id}>
                {p.isActive ? "🟢" : "⚪"} {p.question}
              </option>
            ))}
          </select>
        )}
      </div>

      {showCreate && (
        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <Input placeholder="投票問題，例如：你最喜歡哪個角色？" value={question} onChange={(e) => setQuestion(e.target.value)} />
          <Textarea className="min-h-[80px]" placeholder="選項（每行一個）" value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
          <Button onClick={create}>開始投票</Button>
        </div>
      )}

      {activePoll ? (
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-white p-3 shadow">
            <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/poll/${activePoll.id}`} size={150} />
          </div>
          <p className="text-center text-sm font-medium">{activePoll.question}</p>

          <div className="w-full space-y-2">
            {activePoll.options.map((o, oi) => {
              const pct = totalVotes === 0 ? 0 : Math.round((o.votes / totalVotes) * 100)
              const isCorrect = activePoll.correctIndex !== null && activePoll.correctIndex === oi
              const barColor = !activePoll.isActive
                ? isCorrect
                  ? "bg-emerald-500"
                  : "bg-slate-500"
                : isCorrect
                  ? "bg-emerald-500/70"
                  : BAR_COLORS[oi % BAR_COLORS.length]
              return (
                <div key={o.id}>
                  <div className="mb-0.5 flex justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={cn("inline-block h-2 w-2 rounded-full", barColor)} />
                      {o.text}
                      {isCorrect && !activePoll.isActive && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </span>
                    <span className="font-mono">{o.votes} 票 · {pct}%</span>
                  </div>
                  <div className="h-5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                    <motion.div
                      className={cn("flex h-full items-center justify-end rounded-full pr-1.5 text-[10px] font-bold text-white", barColor)}
                      animate={{ width: `${Math.max(pct, o.votes > 0 ? 12 : 2)}%` }}
                      transition={{ type: "spring", stiffness: 80, damping: 20 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate-400">總票數：{totalVotes}</span>
            {activePoll.correctIndex !== null && !activePoll.isActive && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> 正解：{String.fromCharCode(65 + activePoll.correctIndex)}
              </span>
            )}
            {activePoll.isActive ? (
              <Button variant="destructive" size="sm" onClick={() => closePoll(activePoll.id)}>
                <Square className="h-4 w-4" /> 結束投票
              </Button>
            ) : (
              <span className="flex items-center gap-1 text-xs text-slate-400"><BarChart3 className="h-4 w-4" /> 已結束</span>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-slate-400"><QrCode className="h-4 w-4" /> 學生掃描 QR Code 即可投票</p>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-slate-400">尚未有投票。點擊「新增投票」開始！</p>
      )}
    </div>
  )
}
