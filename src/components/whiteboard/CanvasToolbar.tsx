"use client"

import { useState } from "react"
import { Pencil, Eraser, Square, Circle, Minus, Type, Highlighter, Move, Undo2, Redo2, Trash2, X } from "lucide-react"
import type { CanvasTool } from "./CanvasStage"

interface Props {
  currentTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canvasVisible: boolean
  onClose: () => void
}

const TOOLS: { id: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { id: "select", icon: <Move className="h-5 w-5" />, label: "選擇" },
  { id: "pen", icon: <Pencil className="h-5 w-5" />, label: "畫筆" },
  { id: "eraser", icon: <Eraser className="h-5 w-5" />, label: "橡皮擦" },
  { id: "rect", icon: <Square className="h-5 w-5" />, label: "矩形" },
  { id: "ellipse", icon: <Circle className="h-5 w-5" />, label: "橢圓" },
  { id: "line", icon: <Minus className="h-5 w-5" />, label: "直線" },
  { id: "highlighter", icon: <Highlighter className="h-5 w-5" />, label: "螢光筆" },
  { id: "text", icon: <Type className="h-5 w-5" />, label: "文字" },
]

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#eab308"]
const HIGHLIGHTER_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe"]

export function CanvasToolbar({ currentTool, onToolChange, onUndo, onRedo, onClear, canvasVisible, onClose }: Props) {
  const [color, setColor] = useState("#dc2626")
  const isHighlighter = currentTool === "highlighter"

  if (!canvasVisible) return null

  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/95 p-2 shadow-xl dark:bg-slate-900/95 border border-slate-200/50 dark:border-slate-700/50">
      <button
        onClick={onClose}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        title="關閉畫板"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="h-px bg-slate-200 dark:bg-slate-700" />

      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
            currentTool === tool.id
              ? "bg-sky-500 text-white shadow-md"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

      <div className="flex flex-wrap gap-1 justify-center">
        {(isHighlighter ? HIGHLIGHTER_COLORS : COLORS).map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 ${
              color === c ? "border-sky-500 scale-110" : "border-slate-200 dark:border-slate-700"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

      <button
        onClick={onUndo}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="復原"
      >
        <Undo2 className="h-5 w-5" />
      </button>
      <button
        onClick={onRedo}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="重做"
      >
        <Redo2 className="h-5 w-5" />
      </button>
      <button
        onClick={onClear}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        title="清除"
      >
        <Trash2 className="h-5 w-5" />
      </button>
    </div>
  )
}
