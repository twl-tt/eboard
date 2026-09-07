"use client"

import { useState } from "react"
import { Pencil, Eraser, Square, Circle, Minus, Type, Highlighter, Move, Undo2, Redo2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CanvasTool } from "./CanvasStage"

interface Props {
  currentTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
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

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#eab308", "#eab308"]
const HIGHLIGHTER_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe"]

export function CanvasToolbarPanel({ currentTool, onToolChange, onUndo, onRedo, onClear }: Props) {
  const [color, setColor] = useState("#dc2626")
  const isHighlighter = currentTool === "highlighter"

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onToolChange(tool.id)}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${
              currentTool === tool.id
                ? "bg-sky-500 text-white shadow-lg"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
            title={tool.label}
          >
            {tool.icon}
            <span className="text-[10px]">{tool.label}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700" />

      <div className="flex flex-wrap gap-1.5 justify-center">
        {(isHighlighter ? HIGHLIGHTER_COLORS : COLORS).map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
              color === c ? "border-sky-500 scale-110" : "border-slate-200 dark:border-slate-700"
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="h-px bg-slate-200 dark:bg-slate-700" />

      <div className="flex gap-2 justify-center">
        <Button size="sm" variant="outline" onClick={onUndo} title="復原">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onRedo} title="重做">
          <Redo2 className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onClear} title="清除" className="text-red-500 hover:text-red-600">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
