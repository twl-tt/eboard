"use client"

import { useState, useRef, useEffect } from "react"
import { Pencil, Eraser, Square, Circle, Minus, Type, Highlighter, Move, Undo2, Redo2, Trash2, X } from "lucide-react"
import type { CanvasTool } from "./CanvasStage"

interface Props {
  currentTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  onColorChange: (color: string) => void
  currentColor: string
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canvasVisible: boolean
  onClose: () => void
}

const TOOLS: { id: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <Move className="h-3.5 w-3.5" />, label: "選擇" },
  { id: "pen", icon: <Pencil className="h-3.5 w-3.5" />, label: "畫筆" },
  { id: "eraser", icon: <Eraser className="h-3.5 w-3.5" />, label: "橡皮擦" },
  { id: "rect", icon: <Square className="h-3.5 w-3.5" />, label: "矩形" },
  { id: "ellipse", icon: <Circle className="h-3.5 w-3.5" />, label: "橢圓" },
  { id: "line", icon: <Minus className="h-3.5 w-3.5" />, label: "直線" },
  { id: "highlighter", icon: <Highlighter className="h-3.5 w-3.5" />, label: "螢光筆" },
  { id: "text", icon: <Type className="h-3.5 w-3.5" />, label: "文字" },
]

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#eab308"]
const HIGHLIGHTER_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe"]

export function CanvasToolbar({ currentTool, onToolChange, onColorChange, currentColor, onUndo, onRedo, onClear, canvasVisible, onClose }: Props) {
  const [pos, setPos] = useState({ x: window.innerWidth - 70, y: 20 })
  const dragRef = useRef<{ startX: number; startY: number } | null>(null)
  const isHighlighter = currentTool === "highlighter"

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      setPos({
        x: e.clientX - dragRef.current.startX,
        y: e.clientY - dragRef.current.startY
      })
    }
    const handleMouseUp = () => {
      dragRef.current = null
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  if (!canvasVisible) return null

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    dragRef.current = { startX: e.clientX - pos.x, startY: e.clientY - pos.y }
  }

  return (
    <div
      className="fixed z-50 flex flex-col items-center gap-1 rounded-xl border border-slate-200/50 bg-white/95 px-1.5 py-2 shadow-lg dark:border-slate-700/50 dark:bg-slate-900/95 cursor-move select-none"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={handleMouseDown}
    >
      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        title="關閉"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="w-full h-px bg-slate-200 dark:bg-slate-600 my-0.5" />

      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
            currentTool === tool.id
              ? "bg-sky-500 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <div className="w-full h-px bg-slate-200 dark:bg-slate-600 my-0.5" />

      <div className="flex flex-col gap-1 items-center">
        {(isHighlighter ? HIGHLIGHTER_COLORS : COLORS).map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`h-6 w-6 rounded-full border transition-all hover:scale-110 ${
              currentColor === c ? "border-sky-500 scale-110" : "border-slate-200 dark:border-slate-700"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="w-full h-px bg-slate-200 dark:bg-slate-600 my-0.5" />

      <button
        onClick={onUndo}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="復原"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onRedo}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="重做"
      >
        <Redo2 className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onClear}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        title="清除"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
