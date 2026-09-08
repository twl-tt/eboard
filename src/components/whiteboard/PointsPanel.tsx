"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus, Minus, Trophy, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StudentDTO } from "@/lib/types"
import { celebrate } from "@/lib/sound"
import { cn } from "@/lib/utils"

interface Props {
  students: StudentDTO[]
  onRefresh: () => void
}

export function PointsPanel({ students, onRefresh }: Props) {
  const [ranked, setRanked] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    const handler = () => onRefresh()
    window.addEventListener("points-updated", handler)
    return () => window.removeEventListener("points-updated", handler)
  }, [onRefresh])

  const sorted = [...students].sort((a, b) =>
    ranked ? b.points - a.points : (a.seatNo ?? 999) - (b.seatNo ?? 999)
  )

  const award = useCallback(async (s: StudentDTO, delta: number) => {
    if (busyId === s.id) return
    setBusyId(s.id)
    try {
      await fetch("/api/classroom/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: s.id, delta, reason: delta > 0 ? "課堂表現加分" : "課堂提醒扣分" })
      })
      if (delta > 0) celebrate()
      onRefresh()
    } finally {
      setBusyId(null)
    }
  }, [onRefresh, busyId])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button variant={ranked ? "amber" : "secondary"} size="sm" onClick={() => setRanked((v) => !v)}>
          <Trophy className="h-4 w-4" /> {ranked ? "排行榜模式" : "座號模式"}
        </Button>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          <RefreshCw className="h-4 w-4" /> 重新載入
        </Button>
        <span className="ml-auto text-xs text-slate-400">共 {students.length} 位學生</span>
      </div>

      <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto pr-1">
        {sorted.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border p-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
              ranked && s === sorted[0]
                ? "border-amber-400 bg-gradient-to-b from-amber-400/15 to-transparent"
                : ranked && i === 1
                  ? "border-slate-300 dark:border-slate-500"
                  : ranked && i === 2
                    ? "border-orange-400/70"
                    : "border-slate-200 dark:border-slate-700",
              busyId === s.id && "opacity-50"
            )}
          >
            <span className="w-full truncate text-sm font-semibold">
              {ranked && i < 3 ? ["🥇", "🥈", "🥉"][i] + " " : ""}{s.name}
            </span>
            <span
              onClick={() => setEditingId(editingId === s.id ? null : s.id)}
              className={cn("rounded-full px-2 text-xs font-bold cursor-pointer hover:opacity-80", s.points >= 5 ? "bg-emerald-500/15 text-emerald-500" : "bg-sky-600/15 text-sky-500")}
            >
              {s.points} 分
            </span>
            {editingId === s.id ? (
              <input
                autoFocus
                type="number"
                defaultValue={s.points}
                onBlur={async (e) => {
                  const newPoints = parseInt(e.target.value) || 0
                  const delta = newPoints - s.points
                  if (delta !== 0) {
                    setBusyId(s.id)
                    await fetch("/api/classroom/points", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ studentId: s.id, delta, reason: delta > 0 ? "直接調整分數" : "直接調整分數" })
                    })
                    onRefresh()
                    setBusyId(null)
                  }
                  setEditingId(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur()
                  if (e.key === "Escape") setEditingId(null)
                }}
                className="h-7 w-14 rounded-md border border-sky-400 bg-white px-1 text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-400"
              />
            ) : (
              <div className="mt-1 flex w-full gap-1">
                <button
                  onClick={() => award(s, -1)}
                  className="flex h-8 flex-1 items-center justify-center rounded-lg bg-red-500/15 text-red-500 hover:bg-red-500/25"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => award(s, 1)}
                  className="flex h-8 flex-1 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
