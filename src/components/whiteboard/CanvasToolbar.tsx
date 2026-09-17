"use client"

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
  { id: "read", icon: <Type className="h-3.5 w-3.5" />, label: "選取及複製課文" },
  { id: "select", icon: <Move className="h-3.5 w-3.5" />, label: "選擇" },
  { id: "pen", icon: <Pencil className="h-3.5 w-3.5" />, label: "畫筆" },
  { id: "eraser", icon: <Eraser className="h-3.5 w-3.5" />, label: "橡皮擦" },
  { id: "rect", icon: <Square className="h-3.5 w-3.5" />, label: "矩形" },
  { id: "ellipse", icon: <Circle className="h-3.5 w-3.5" />, label: "橢圓" },
  { id: "line", icon: <Minus className="h-3.5 w-3.5" />, label: "直線" },
  { id: "highlighter", icon: <Highlighter className="h-3.5 w-3.5" />, label: "螢光筆" },
  { id: "text", icon: <Type className="h-3.5 w-3.5" />, label: "文字" },
]

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a"]

export function CanvasToolbar({ currentTool, onToolChange, onColorChange, currentColor, onUndo, onRedo, onClear, canvasVisible, onClose }: Props) {
  if (!canvasVisible) return null

  return (
    <div
      role="toolbar"
      aria-label="畫布工具"
      className="fixed bottom-5 left-2 z-50 grid max-h-[50dvh] grid-cols-2 items-center gap-1 overflow-y-auto rounded-xl border border-slate-200/50 bg-white/95 p-2 shadow-lg dark:border-slate-700/50 dark:bg-slate-900/95 select-none"
    >
      <button
        onClick={onClose}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        title="關閉"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="col-span-2 w-full h-px bg-slate-200 dark:bg-slate-600 my-0.5" />

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

      <div className="col-span-2 w-full h-px bg-slate-200 dark:bg-slate-600 my-0.5" />

      <div className="col-span-2 grid grid-cols-2 gap-2 justify-items-center" aria-label="四種顏色">
        {COLORS.map((c) => (
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

      <div className="col-span-2 w-full h-px bg-slate-200 dark:bg-slate-600 my-0.5" />

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
