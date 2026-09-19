"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StudentDTO } from "@/lib/types"
import { celebrate, tick, ding } from "@/lib/sound"
import { cn } from "@/lib/utils"

interface Props {
  students: StudentDTO[]
  classFilter: string
  onClassFilterChange: (filter: string) => void
}

type Phase = "idle" | "roam" | "descend" | "grab" | "lift" | "move" | "drop" | "done"

const DOLL_COLORS = [
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-600",
  "from-cyan-400 to-sky-500",
  "from-lime-400 to-green-500",
  "from-fuchsia-400 to-pink-500"
]

const HOME_X = 132
const HOME_Y = 26
const DROP_X = 222
const DROP_Y = 318

export function LuckyPicker({ students, classFilter, onClassFilterChange }: Props) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [clawX, setClawX] = useState(HOME_X)
  const [highlight, setHighlight] = useState(-1)
  const [winnerIdx, setWinnerIdx] = useState(0)
  const [winner, setWinner] = useState<StudentDTO | null>(null)
  const [awarding, setAwarding] = useState(false)
  const [awardError, setAwardError] = useState("")
  const timersRef = useRef<number[]>([])
  const rollToken = useRef(0)

  const classes = useMemo(() => {
    const set = new Set<string>()
    for (const s of students) if (s.className) set.add(s.className)
    return Array.from(set).sort()
  }, [students])

  const filtered = useMemo(
    () => classFilter === "__all__" ? students : students.filter((s) => s.className === classFilter),
    [students, classFilter]
  )

  const pile = useMemo(
    () =>
      filtered.map((_, i) => ({
        x: 14 + (i % 3) * 92 + ((i * 31) % 12),
        y: 108 + (Math.floor(i / 3) % 4) * 60 + ((i * 17) % 8),
        r: ((i * 47) % 9) - 4
      })),
    [filtered]
  )

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  useEffect(
    () => () => {
      rollToken.current++
      clearTimers()
    },
    []
  )

  useEffect(() => {
    rollToken.current++
    clearTimers()
    setPhase("idle")
    setClawX(HOME_X)
    setHighlight(-1)
    setWinner(null)
  }, [classFilter])

  if (students.length === 0) {
    return <p className="py-8 text-center text-slate-400">請先在管理後台匯入學生名單。</p>
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <p className="text-sm text-slate-400">此班別暫無學生。</p>
        <Button variant="secondary" onClick={() => onClassFilterChange("__all__")}>顯示全部</Button>
      </div>
    )
  }

  const roll = () => {
    if ((phase !== "idle" && phase !== "done") || awarding || filtered.length === 0) return
    const token = ++rollToken.current
    clearTimers()
    setWinner(null)
    setAwardError("")
    const pool = filtered
    const w = Math.floor(Math.random() * pool.length)
    setWinnerIdx(w)
    setPhase("roam")

    const xs = pile.map((p) => p.x)
    let step = 0
    const roamStep = () => {
      if (token !== rollToken.current) return
      if (step < 7) {
        const next = Math.floor(Math.random() * xs.length)
        setClawX(xs[next])
        setHighlight(next)
        tick()
        step++
        timersRef.current.push(window.setTimeout(roamStep, 210 + step * 40))
      } else {
        setHighlight(w)
        setClawX(pile[w].x)
        setPhase("descend")
        timersRef.current.push(window.setTimeout(() => { if (token === rollToken.current) { setPhase("grab"); tick() } }, 760))
        timersRef.current.push(window.setTimeout(() => { if (token === rollToken.current) setPhase("lift") }, 1120))
        timersRef.current.push(window.setTimeout(() => { if (token === rollToken.current) setPhase("move") }, 1900))
        timersRef.current.push(window.setTimeout(() => { if (token === rollToken.current) setPhase("drop") }, 2660))
        timersRef.current.push(
          window.setTimeout(() => {
            if (token !== rollToken.current) return
            setPhase("done")
            setHighlight(-1)
            setWinner(pool[w])
            ding()
            celebrate()
          }, 3280)
        )
      }
    }
    roamStep()
  }

  async function award(delta: number) {
    if (!winner || awarding) return
    const token = rollToken.current
    setAwarding(true)
    setAwardError("")
    try {
      const response = await fetch("/api/classroom/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: winner.id, delta, reason: `抽選回答（${winner.name}）` })
      })
      if (!response.ok) throw new Error("award failed")
      window.dispatchEvent(new CustomEvent("points-updated"))
      if (token !== rollToken.current) return
      if (delta > 0) celebrate()
      setWinner(null)
      setPhase("idle")
      setClawX(HOME_X)
    } catch {
      if (token === rollToken.current) setAwardError("未能更新分數，請重試。")
    } finally {
      setAwarding(false)
    }
  }

  const active = phase !== "idle" && phase !== "done"
  const grabbed = phase === "grab" || phase === "lift" || phase === "move"
  const clawY = phase === "descend" || phase === "grab" ? (pile[winnerIdx]?.y ?? 108) - 66 : HOME_Y
  const clawTargetX = phase === "move" || phase === "drop" ? DROP_X : phase === "descend" || phase === "grab" ? pile[winnerIdx]?.x ?? clawX : clawX
  const clawTransition =
    phase === "descend" || phase === "lift" || phase === "move"
      ? { duration: 0.7, ease: "easeInOut" as const }
      : { type: "spring" as const, stiffness: 170, damping: 20 }
  const prongOpen = !grabbed
  const heldName = pool_name(filtered, winnerIdx)
  const prongSpread = prongOpen ? 34 : 7
  const clawBody = (
    <>
      <div className="h-2 w-14 rounded-full bg-slate-500 shadow dark:bg-slate-400" />
      <div className="h-8 w-1.5 rounded-full bg-gradient-to-b from-slate-400 to-slate-600 dark:from-slate-300 dark:to-slate-500" />
      <div className="relative h-16 w-16">
        <div
          className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full border border-slate-600 bg-gradient-to-b from-slate-200 to-slate-400 shadow dark:border-slate-500 dark:from-slate-100 dark:to-slate-400"
        />
        {grabbed && (
          <div
            className={cn(
              "absolute left-1/2 top-2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-black text-white shadow-lg",
              DOLL_COLORS[winnerIdx % DOLL_COLORS.length]
            )}
          >
            {heldName}
          </div>
        )}
        {[-1, 0, 1].map((side) => {
          const spread = side === 0 ? 0 : prongSpread
          return (
            <motion.svg
              key={side}
              className="absolute left-1/2 top-2 h-14 w-14 -translate-x-1/2"
              viewBox="0 0 48 56"
              style={side === 0 ? { zIndex: 1 } : undefined}
              animate={{ rotate: side * spread }}
              transition={{ type: "spring", stiffness: 300, damping: 17 }}
            >
              <path
                d="M24 2 C 24 22, 12 26, 8 44 Q 6 52 13 52"
                fill="none"
                stroke="url(#claw-metal)"
                strokeWidth="4.5"
                strokeLinecap="round"
              />
            </motion.svg>
          )
        })}
      </div>
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="claw-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="45%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
      </svg>
    </>
  )

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {classes.length > 0 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
          <button
            onClick={() => onClassFilterChange("__all__")}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition-all",
              classFilter === "__all__"
                ? "border-pink-400 bg-pink-500/20 text-pink-700 dark:text-pink-200"
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
                onClick={() => onClassFilterChange(c)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition-all",
                  classFilter === c
                    ? "border-pink-400 bg-pink-500/20 text-pink-700 dark:text-pink-200"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300"
                )}
              >
                {c} ({count})
              </button>
            )
          })}
        </div>
      )}

      <div className="w-[320px] select-none">
        <div className="relative h-[420px] overflow-hidden rounded-3xl border-4 border-pink-400/80 bg-gradient-to-b from-pink-100 to-rose-200 shadow-2xl shadow-pink-500/30 dark:border-pink-500/40 dark:from-slate-800 dark:to-slate-900">
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 via-rose-500 to-pink-500 py-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-amber-200"
                animate={active ? { opacity: [0.25, 1, 0.25] } : { opacity: 0.6 }}
                transition={active ? { repeat: Infinity, duration: 0.9, delay: i * 0.1 } : { duration: 0.2 }}
              />
            ))}
          </div>

          <div className="absolute inset-x-2 bottom-2 top-9 overflow-hidden rounded-2xl bg-gradient-to-b from-white/70 to-white/20 dark:from-slate-700/40 dark:to-slate-800/30">
            <div className="absolute bottom-1 right-1 z-0 flex h-14 w-16 items-center justify-center rounded-xl bg-slate-900/80 text-[10px] font-bold text-white/60 dark:bg-slate-950/80">
              出口
            </div>

            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                className={cn(
                  "absolute z-[1] flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br px-1 text-center text-[11px] font-black leading-tight text-white shadow-lg",
                  DOLL_COLORS[i % DOLL_COLORS.length],
                  highlight === i && "ring-4 ring-white/90",
                  (grabbed || phase === "drop" || phase === "done") && i === winnerIdx && "opacity-0"
                )}
                style={{ left: pile[i].x, top: pile[i].y, rotate: pile[i].r }}
                animate={highlight === i && active ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={highlight === i && active ? { repeat: Infinity, duration: 0.45 } : { duration: 0.2 }}
              >
                {s.name}
              </motion.div>
            ))}

            {phase === "drop" && (
              <motion.div
                key={`drop-${winnerIdx}`}
                className={cn(
                  "absolute z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-black text-white shadow-lg",
                  DOLL_COLORS[winnerIdx % DOLL_COLORS.length]
                )}
                style={{ left: DROP_X, top: pile[winnerIdx]?.y ?? 200 }}
                initial={{ opacity: 1, rotate: 0 }}
                animate={{ y: DROP_Y - (pile[winnerIdx]?.y ?? 200), opacity: [1, 1, 0], rotate: 30 }}
                transition={{ duration: 0.58, ease: "easeIn", times: [0, 0.75, 1] }}
              >
                {heldName}
              </motion.div>
            )}

            <motion.div
              className="absolute left-0 top-0 z-10 flex flex-col items-center"
              animate={{ x: clawTargetX, y: clawY }}
              transition={clawTransition}
            >
              {clawBody}
            </motion.div>
          </div>
        </div>
      </div>

      <Button
        size="xl"
        onClick={roll}
        disabled={active || awarding}
        className="w-full bg-gradient-to-r from-pink-500 to-rose-600 shadow-lg shadow-pink-500/40 hover:from-pink-400 hover:to-rose-500"
      >
        {active ? "抽選中…" : "開始"}
      </Button>

      {awardError && (
        <p className="text-xs font-semibold text-red-500">{awardError}</p>
      )}

      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="w-full rounded-2xl border border-emerald-500/50 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 p-4 text-center"
          >
            <p className="text-xl font-black text-emerald-500 dark:text-emerald-300">🎉 {winner.name}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button variant="success" disabled={awarding} onClick={() => award(1)} className="shadow-md shadow-emerald-500/30">
                <Star className="h-4 w-4" /> 加 1 分
              </Button>
              <Button variant="outline" disabled={awarding} onClick={() => award(-1)}>
                扣 1 分
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function pool_name(pool: StudentDTO[], i: number) {
  return pool[i]?.name ?? "?"
}
