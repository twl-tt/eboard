"use client"

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Dices, Star, BarChart3, Brain, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { StudentDTO } from "@/lib/types"
import { LuckyPicker } from "./LuckyPicker"
import { PointsPanel } from "./PointsPanel"
import { PollPanel } from "./PollPanel"
import { QuizPanel } from "./QuizPanel"
import { cn } from "@/lib/utils"

type PanelKey = "picker" | "points" | "poll" | "quiz" | null

const GRADIENTS: Record<Exclude<PanelKey, null>, { grad: string; glow: string; label: string }> = {
  picker: { grad: "from-violet-500 to-fuchsia-600", glow: "shadow-fuchsia-500/40", label: "抽籤" },
  points: { grad: "from-amber-400 to-orange-500", glow: "shadow-orange-500/40", label: "加分" },
  poll: { grad: "from-emerald-400 to-teal-600", glow: "shadow-emerald-500/40", label: "投票" },
  quiz: { grad: "from-indigo-500 to-violet-600", glow: "shadow-indigo-500/40", label: "測驗" }
}

const ICONS: Record<Exclude<PanelKey, null>, React.ReactNode> = {
  picker: <Dices className="h-7 w-7" />,
  points: <Star className="h-7 w-7" />,
  poll: <BarChart3 className="h-7 w-7" />,
  quiz: <Brain className="h-7 w-7" />
}

export function ClassroomSuite() {
  const [panel, setPanel] = useState<PanelKey>(null)
  const [students, setStudents] = useState<StudentDTO[]>([])

  const loadStudents = useCallback(async () => {
    const res = await fetch("/api/students")
    if (res.ok) {
      const data: StudentDTO[] = await res.json()
      setStudents(data)
    }
  }, [])

  useEffect(() => {
    if (panel === "picker" || panel === "points") loadStudents()
  }, [panel, loadStudents])

  const keys: Exclude<PanelKey, null>[] = ["picker", "points", "poll", "quiz"]

  return (
    <>
      <div className="fixed bottom-5 right-5 z-40 flex flex-col gap-2.5">
        {keys.map((k, i) => (
          <motion.button
            key={k}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.12 * i, type: "spring", stiffness: 260, damping: 22 }}
            whileHover={{ scale: 1.07, y: -2 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setPanel(panel === k ? null : k)}
            className={cn(
              "flex h-[64px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-3xl bg-gradient-to-br text-white shadow-xl transition-shadow",
              GRADIENTS[k].grad,
              GRADIENTS[k].glow,
              panel === k && "ring-4 ring-white/60 dark:ring-white/30"
            )}
          >
            {ICONS[k]}
            <span className="text-xs font-black tracking-wide">{GRADIENTS[k].label}</span>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {panel && (
          <motion.div
            initial={{ x: 440, opacity: 0, scale: 0.96 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 440, opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
            className="fixed bottom-5 right-24 z-40 flex max-h-[80vh] w-[390px] flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/90 shadow-2xl shadow-slate-900/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85"
          >
            <div className={cn("h-1.5 w-full bg-gradient-to-r", GRADIENTS[panel].grad)} />
            <div className="flex items-center justify-between px-4 py-2.5">
              <h3 className="font-bold">
                {panel === "picker" ? "🎲 隨機抽籤" : panel === "points" ? "⭐ 課室加分" : panel === "poll" ? "📊 即時投票" : "🧠 AI 測驗"}
              </h3>
              <Button variant="ghost" size="icon" onClick={() => setPanel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="overflow-y-auto p-4 pt-0">
              {panel === "picker" && <LuckyPicker students={students} />}
              {panel === "points" && <PointsPanel students={students} onRefresh={loadStudents} />}
              {panel === "poll" && <PollPanel />}
              {panel === "quiz" && <QuizPanel />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
