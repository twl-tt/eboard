"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

export function TimerPanel() {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
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
    timerRef.current = setInterval(() => {
      setElapsed(v => v + 1)
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
    setElapsed(0)
    setLaps([])
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const lap = () => {
    setLaps(prev => [...prev, elapsed])
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-5xl font-bold text-gray-800 dark:text-gray-200 mb-2">
          {formatTime(elapsed)}
        </div>
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