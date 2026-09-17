"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function TimerPanel() {
  const [mode, setMode] = useState<"countup" | "countdown">("countup")
  const [targetSeconds, setTargetSeconds] = useState(120)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const start = () => {
    if (running) return
    setRunning(true)
    setFinished(false)
    timerRef.current = setInterval(() => {
      setElapsed(v => {
        const next = mode === "countdown" ? v - 1 : v + 1
        if (mode === "countdown" && next <= 0) {
          setRunning(false)
          setFinished(true)
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return next
      })
    }, 1000)
  }

  const pause = () => {
    setRunning(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const reset = () => {
    setRunning(false)
    setElapsed(mode === "countdown" ? targetSeconds : 0)
    setLaps([])
    setFinished(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const lap = () => {
    setLaps(prev => [...prev, mode === "countdown" ? targetSeconds - elapsed : elapsed])
  }

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    const parts = [
      hrs > 0 ? `${hrs.toString().padStart(2, "0")}` : null,
      `${mins.toString().padStart(2, "0")}`,
      `${secs.toString().padStart(2, "0")}`
    ].filter(Boolean)
    return parts.join(":")
  }

  const toggleMode = (m: "countup" | "countdown") => {
    setMode(m)
    setElapsed(m === "countdown" ? targetSeconds : 0)
    setRunning(false)
    setLaps([])
    setFinished(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 justify-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
        <button
          onClick={() => toggleMode("countup")}
          className={cn("px-3 py-1 text-sm rounded-lg font-medium", mode === "countup" ? "bg-white dark:bg-slate-700 shadow" : "text-slate-500")}
        >
          正計時
        </button>
        <button
          onClick={() => toggleMode("countdown")}
          className={cn("px-3 py-1 text-sm rounded-lg font-medium", mode === "countdown" ? "bg-white dark:bg-slate-700 shadow" : "text-slate-500")}
        >
          倒計時
        </button>
      </div>

      {mode === "countdown" && (
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-slate-500">目標時間</span>
          <input
            type="number"
            min={1}
            max={3600}
            value={targetSeconds}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0
              setTargetSeconds(v)
              if (!running) setElapsed(v)
            }}
            className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm text-center dark:border-slate-600 dark:bg-slate-800"
          />
          <span className="text-xs text-slate-500">秒</span>
        </div>
      )}

      <div className="text-center">
        <div className={cn("text-5xl font-bold mb-2", finished && "text-red-500")}>
          {formatTime(elapsed)}
        </div>
        {finished && <p className="text-red-500 text-sm font-medium mb-2">⏰ 時間到！</p>}
        <div className="flex gap-2 justify-center">
          <Button 
            size="sm"
            onClick={running ? pause : start}
            className={running 
              ? "bg-red-500 hover:bg-red-600" 
              : "bg-green-500 hover:bg-green-600"}
          >
            {running ? "暫停" : "開始"}
          </Button>
          <Button 
            size="sm"
            onClick={reset}
            className="bg-gray-500 hover:bg-gray-600"
          >
            重置
          </Button>
          {running && (
            <Button 
              size="sm"
              onClick={lap}
              className="bg-blue-500 hover:bg-blue-600"
            >
              圈數
            </Button>
          )}
        </div>
        {laps.length > 0 && (
          <div className="mt-3">
            <h4 className="text-sm font-medium mb-2">圈數紀錄</h4>
            <div className="space-y-1 text-xs">
              {laps.map((lapTime, index) => (
                <div key={index} className="flex justify-between">
                  <span>第 {index + 1} 圈</span>
                  <span>{formatTime(lapTime)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ")
}