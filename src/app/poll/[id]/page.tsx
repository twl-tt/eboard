"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import type { PollDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

export default function PollVotePage({ params }: { params: { id: string } }) {
  const [poll, setPoll] = useState<PollDTO | null>(null)
  const [voted, setVoted] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/classroom/polls/${params.id}`)
      if (!res.ok) throw new Error("找不到此投票")
      setPoll(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [params.id])

  useEffect(() => {
    try {
      if (localStorage.getItem(`wrp-voted-${params.id}`)) setVoted(true)
    } catch {}
    load()
  }, [load, params.id])

  useEffect(() => {
    if (!poll) return
    const t = setInterval(() => {
      fetch(`/api/classroom/polls/${params.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((p: PollDTO | null) => p && setPoll(p))
        .catch(() => {})
    }, 3000)
    return () => clearInterval(t)
  }, [poll?.id, params.id])

  async function vote(optionId: string) {
    if (!poll?.isActive || voted || busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/classroom/polls/${poll.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "投票失敗")
      setPoll(data)
      setVoted(true)
      try {
        localStorage.setItem(`wrp-voted-${poll.id}`, "1")
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const total = poll?.options.reduce((s, o) => s + o.votes, 0) ?? 0

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sky-600 to-indigo-800 p-5 font-han">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <h1 className="mb-1 text-center text-xl font-bold">{poll?.question ?? "載入中…"}</h1>
        <p className="mb-5 text-center text-xs text-slate-400">校本智慧電子白板 · 即時投票</p>

        {!poll && !error && <p className="py-8 text-center text-slate-400">連線中…</p>}
        {error && <p className="py-8 text-center text-red-500">{error}</p>}

        {poll && (
          <>
            <div className="space-y-2.5">
              {poll.options.map((o) => (
                <button
                  key={o.id}
                  disabled={!poll.isActive || voted}
                  onClick={() => vote(o.id)}
                  className={cn(
                    "relative w-full overflow-hidden rounded-2xl border px-4 py-3.5 text-left text-lg font-medium transition-all",
                    poll.isActive && !voted
                      ? "border-slate-200 hover:border-sky-400 hover:bg-sky-50 active:scale-[0.98] dark:border-slate-700 dark:hover:bg-sky-950"
                      : "border-slate-200 dark:border-slate-700"
                  )}
                >
                  {voted && total > 0 && (
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: `${(o.votes / total) * 100}%` }}
                      className="absolute inset-y-0 left-0 bg-sky-500/15"
                      transition={{ type: "spring", stiffness: 70 }}
                    />
                  )}
                  <span className="relative flex justify-between">
                    <span>{o.text}</span>
                    {voted && <span className="text-sm text-sky-500">{o.votes} 票</span>}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-center text-sm">
              {voted ? (
                <span className="font-medium text-emerald-500">✓ 已投票！結果會即時顯示在白板上</span>
              ) : poll.isActive ? (
                <span className="text-slate-400">點擊選項即完成投票</span>
              ) : (
                <span className="text-red-400">此投票已結束</span>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
