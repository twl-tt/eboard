"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dices, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StudentDTO } from "@/lib/types"
import { celebrate, tick, ding } from "@/lib/sound"
import { cn } from "@/lib/utils"

interface Props {
  students: StudentDTO[]
}

const SEGMENT_GRADIENT =
  "conic-gradient(#6366f1 0deg 45deg, #8b5cf6 45deg 90deg, #ec4899 90deg 135deg, #f59e0b 135deg 180deg, #10b981 180deg 225deg, #06b6d4 225deg 270deg, #3b82f6 270deg 315deg, #a855f7 315deg 360deg)"

export function LuckyPicker({ students }: Props) {
  const [rolling, setRolling] = useState(false)
  const [idx, setIdx] = useState(0)
  const [winner, setWinner] = useState<StudentDTO | null>(null)
  const [classFilter, setClassFilter] = useState<string>("__all__")
  const timersRef = useRef<number[]>([])

  const classes = useMemo(() => {
    const set = new Set<string>()
    for (const s of students) if (s.className) set.add(s.className)
    return Array.from(set).sort()
  }, [students])

  const filtered = useMemo(
    () => classFilter === "__all__" ? students : students.filter((s) => s.className === classFilter),
    [students, classFilter]
  )

  useEffect(() => () => timersRef.current.forEach(clearTimeout), [])
  useEffect(() => { setIdx(0); setWinner(null) }, [classFilter])

  if (students.length === 0) {
    return <p className="py-8 text-center text-slate-400">請先在管理後台匯入學生名單。</p>
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-slate-400">此班別暫無學生。</p>
        <Button variant="secondary" onClick={() => setClassFilter("__all__")}>顯示全部</Button>
      </div>
    )
  }

  const roll = () => {
    if (rolling) return
    setRolling(true)
    setWinner(null)
    let delay = 60
    let t = 0
    const step = () => {
      setIdx(Math.floor(Math.random() * filtered.length))
      tick()
      delay *= 1.14
      t += delay
      if (t < 2600) {
        timersRef.current.push(window.setTimeout(step, delay))
      } else {
        const w = Math.floor(Math.random() * filtered.length)
        setIdx(w)
        setWinner(filtered[w])
        setRolling(false)
        ding()
        celebrate()
      }
    }
    step()
  }

  async function award(delta: number) {
    if (!winner) return
    await fetch("/api/classroom/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: winner.id, delta, reason: `抽籤回答（${winner.name}）` })
    })
    if (delta > 0) {
      celebrate()
      window.dispatchEvent(new CustomEvent("points-updated"))
    }
    setWinner(null)
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {classes.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => setClassFilter("__all__")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition-all",
              classFilter === "__all__"
                ? "border-violet-400 bg-violet-500/20 text-violet-700 dark:text-violet-200"
                : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
            )}
          >
            全部 ({students.length})
          </button>
          {classes.map((c) => {
            const count = students.filter((s) => s.className === c).length
            return (
              <button
                key={c}
                onClick={() => setClassFilter(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition-all",
                  classFilter === c
                    ? "border-violet-400 bg-violet-500/20 text-violet-700 dark:text-violet-200"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                )}
              >
                {c} ({count})
              </button>
            )
          })}
        </div>
      )}
      <div className="relative">
        <motion.div
          animate={rolling ? { rotate: 360 } : { rotate: 0 }}
          transition={rolling ? { repeat: Infinity, duration: 1.4, ease: "linear" } : { duration: 0.4 }}
          className="h-56 w-56 rounded-full shadow-2xl shadow-indigo-500/30"
          style={{ background: SEGMENT_GRADIENT }}
        />
        <div className="absolute inset-[14px] rounded-full border-4 border-white bg-white shadow-inner dark:border-slate-900 dark:bg-slate-900" />
        <motion.span
          key={idx}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.09 }}
          className="absolute inset-0 flex items-center justify-center px-6 text-center text-2xl font-black text-slate-900 dark:text-white"
        >
          {filtered[idx]?.name ?? "?"}
        </motion.span>
        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-0.5 text-xs font-black text-white shadow-lg shadow-orange-500/40">
          {filtered[idx]?.seatNo ? `${filtered[idx].seatNo} 號` : "READY"}
        </span>
        <div
          className={cn(
            "absolute -top-3 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[10px] border-t-[16px] border-x-transparent",
            rolling ? "border-t-red-500" : "border-t-amber-400"
          )}
          style={{ filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.25))" }}
        />
        {rolling && (
          <motion.div
            animate={{ opacity: [0.4, 0.15, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.7 }}
            className="pointer-events-none absolute -inset-3 rounded-full bg-gradient-to-br from-fuchsia-500/40 to-violet-500/40 blur-lg"
          />
        )}
      </div>

      <Button size="xl" onClick={roll} disabled={rolling} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-600 shadow-lg shadow-fuchsia-500/40 hover:from-violet-400 hover:to-fuchsia-500">
        <Dices className="h-6 w-6" /> {rolling ? "抽籤中…" : "🎲 開始抽籤"}
      </Button>

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="w-full rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 text-center"
          >
            <p className="text-xl font-black text-emerald-500 dark:text-emerald-300">🎉 恭喜 {winner.name}！</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="success" onClick={() => award(1)} className="shadow-md shadow-emerald-500/30">
                <Star className="h-4 w-4" /> 加 1 分
              </Button>
              <Button variant="outline" onClick={() => award(-1)}>
                扣 1 分
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
