"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Dices, ListOrdered, Trash2, Users, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import type { StudentDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  students: StudentDTO[]
  onRefresh: () => void | Promise<void>
}

const GROUP_GRADIENTS = [
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-sky-400 to-blue-600",
  "from-violet-400 to-purple-600",
  "from-fuchsia-400 to-pink-600",
  "from-lime-400 to-green-600",
  "from-cyan-400 to-sky-600"
]

export function GroupPanel({ students, onRefresh }: Props) {
  const [groupCount, setGroupCount] = useState(4)
  const [classFilter, setClassFilter] = useState("__all__")
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)

  const classes = useMemo(() => {
    const set = new Set<string>()
    for (const s of students) if (s.className) set.add(s.className)
    return Array.from(set).sort()
  }, [students])

  const filtered = useMemo(
    () => classFilter === "__all__" ? students : students.filter((s) => s.className === classFilter),
    [students, classFilter]
  )

  const groups = useMemo(() => {
    const map = new Map<string, StudentDTO[]>()
    for (let i = 1; i <= groupCount; i++) {
      map.set(`G${i}`, [])
    }
    for (const s of filtered) {
      if (s.group && map.has(s.group)) {
        map.get(s.group)!.push(s)
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.seatNo ?? 9999) - (b.seatNo ?? 9999))
    }
    return map
  }, [filtered, groupCount])

  const unassigned = filtered.filter((s) => !s.group || !groups.has(s.group))

  async function setGroup(studentId: string, group: string | null) {
    setBusy(true)
    try {
      await fetch(`/api/students/${studentId}/group`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group })
      })
      await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  async function bulkAssign(mode: "random" | "sequential") {
    setBusy(true)
    try {
      await fetch("/api/students/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className: classFilter === "__all__" ? null : classFilter, count: groupCount, mode })
      })
      await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  async function clearAll() {
    if (!confirm("清除此班別所有學生的分組？")) return
    setBusy(true)
    try {
      await fetch("/api/students/clear-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ className: classFilter === "__all__" ? null : classFilter })
      })
      await onRefresh()
    } finally {
      setBusy(false)
    }
  }

  if (students.length === 0) {
    return <p className="py-8 text-center text-slate-400">請先在管理後台匯入學生名單。</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {classes.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/70 px-2 py-1 dark:border-slate-700 dark:bg-slate-800/60">
          <span className="text-xs font-bold text-slate-500">分組數量</span>
          <button onClick={() => setGroupCount((c) => Math.max(1, c - 1))} className="h-6 w-6 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">−</button>
          <span className="w-6 text-center font-bold tabular-nums">{groupCount}</span>
          <button onClick={() => setGroupCount((c) => Math.min(8, c + 1))} className="h-6 w-6 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200">+</button>
        </div>
        <Button size="sm" variant="secondary" onClick={() => bulkAssign("sequential")} disabled={busy}>
          <ListOrdered className="h-4 w-4" /> 依學號
        </Button>
        <Button size="sm" onClick={() => bulkAssign("random")} disabled={busy} className="bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-md shadow-fuchsia-500/30 hover:from-violet-400 hover:to-fuchsia-500">
          <Dices className="h-4 w-4" /> 隨機分組
        </Button>
        <Button size="sm" variant="ghost" onClick={clearAll} disabled={busy}>
          <Trash2 className="h-4 w-4" /> 清空分組
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Array.from(groups.entries()).map(([gname], idx) => {
          const list = groups.get(gname) ?? []
          return (
            <div
              key={gname}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move" }}
              onDrop={(e) => {
                e.preventDefault()
                const id = e.dataTransfer.getData("student-id")
                if (id) setGroup(id, gname)
              }}
              className={cn(
                "flex min-h-[110px] flex-col gap-1.5 rounded-2xl border-2 border-dashed p-2 transition-all",
                selected
                  ? "border-violet-400 bg-violet-50 dark:bg-violet-900/20"
                  : "border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={cn("rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-black text-white shadow", GROUP_GRADIENTS[idx % GROUP_GRADIENTS.length])}>
                  {gname}
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{list.length} 人</span>
              </div>
              <div className="flex flex-wrap gap-1">
                <AnimatePresence>
                  {list.map((s) => (
                    <motion.button
                      key={s.id}
                      layout
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      draggable
                      onDragStart={(e) => {
                        const evt = e as unknown as React.DragEvent
                        evt.dataTransfer?.setData("student-id", s.id)
                      }}
                      onClick={() => setGroup(s.id, null)}
                      title={`${s.name}${s.seatNo ? ` (${s.seatNo} 號)` : ""} — 點擊移出`}
                      className="rounded-full border border-white/30 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-sm hover:scale-105 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    >
                      {s.seatNo ? `${s.seatNo}.` : ""}{s.name}
                    </motion.button>
                  ))}
                </AnimatePresence>
                {list.length === 0 && (
                  <span className="self-center text-[11px] text-slate-400">拖曳學生至此</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault() }}
        onDrop={(e) => {
          e.preventDefault()
          const id = e.dataTransfer.getData("student-id")
          if (id) setGroup(id, null)
        }}
        className="rounded-2xl border border-slate-200 bg-white/60 p-2 dark:border-slate-700 dark:bg-slate-800/40"
      >
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">📋 未分組 ({unassigned.length} 人)</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {unassigned.map((s) => (
            <button
              key={s.id}
              draggable
              onDragStart={(e) => {
                const evt = e as unknown as React.DragEvent
                evt.dataTransfer?.setData("student-id", s.id)
              }}
              onClick={() => {
                setSelected(selected === s.id ? null : s.id)
              }}
              className={cn(
                "rounded-full border bg-white px-2 py-0.5 text-[11px] font-bold shadow-sm transition-all hover:scale-105 dark:bg-slate-900",
                selected === s.id
                  ? "border-violet-400 text-violet-700 ring-2 ring-violet-300 dark:text-violet-200"
                  : "border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              )}
            >
              {s.seatNo ? `${s.seatNo}.` : ""}{s.name}
            </button>
          ))}
          {unassigned.length === 0 && (
            <span className="text-[11px] text-slate-400">已全部分組 🎉</span>
          )}
        </div>
        {selected && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">選擇組別：</span>
            {Array.from(groups.keys()).map((g, idx) => (
              <button
                key={g}
                onClick={() => { setGroup(selected, g); setSelected(null) }}
                className={cn("rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-black text-white shadow", GROUP_GRADIENTS[idx % GROUP_GRADIENTS.length])}
              >
                {g}
              </button>
            ))}
            <button onClick={() => setSelected(null)} className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700"><X className="inline h-3 w-3" /></button>
          </div>
        )}
      </div>
    </div>
  )
}
