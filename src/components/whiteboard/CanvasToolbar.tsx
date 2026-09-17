"use client"

import { useEffect, useRef, useState } from "react"
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
  { id: "read", icon: <Type className="h-4 w-4" />, label: "選取及複製課文" },
  { id: "select", icon: <Move className="h-4 w-4" />, label: "選擇" },
  { id: "pen", icon: <Pencil className="h-4 w-4" />, label: "畫筆" },
  { id: "eraser", icon: <Eraser className="h-4 w-4" />, label: "橡皮擦" },
  { id: "rect", icon: <Square className="h-4 w-4" />, label: "矩形" },
  { id: "ellipse", icon: <Circle className="h-4 w-4" />, label: "橢圓" },
  { id: "line", icon: <Minus className="h-4 w-4" />, label: "直線" },
  { id: "highlighter", icon: <Highlighter className="h-4 w-4" />, label: "螢光筆" },
  { id: "text", icon: <Type className="h-4 w-4" />, label: "文字" },
]

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a"]

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

export function CanvasToolbar({ currentTool, onToolChange, onColorChange, currentColor, onUndo, onRedo, onClear, canvasVisible, onClose }: Props) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const draggedRef = useRef(false)

  useEffect(() => {
    const place = () => {
      const w = barRef.current?.offsetWidth ?? 560
      const h = barRef.current?.offsetHeight ?? 44
      setPos(prev => prev ?? { x: window.innerWidth - w - 20, y: window.innerHeight - h - 356 })
    }
    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [])

  if (!canvasVisible) return null

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const rect = barRef.current!.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    draggedRef.current = false
  }

  useEffect(() => {
    const moveDrag = (e: PointerEvent) => {
      if (!dragRef.current || !barRef.current) return
      const w = barRef.current.offsetWidth
      const h = barRef.current.offsetHeight
      setPos({
        x: clamp(e.clientX - dragRef.current.dx, 4, window.innerWidth - w - 4),
        y: clamp(e.clientY - dragRef.current.dy, 4, window.innerHeight - h - 4)
      })
      draggedRef.current = true
    }
    const endDrag = () => { dragRef.current = null }
    window.addEventListener("pointermove", moveDrag)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
    return () => {
      window.removeEventListener("pointermove", moveDrag)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
    }
  }, [])
  const suppressClickAfterDrag = (e: React.MouseEvent) => {
    if (draggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      draggedRef.current = false
    }
  }

  const toolBtn = (active: boolean) =>
    `flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all ${
      active ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="畫布工具"
      className="fixed z-50 flex max-w-[calc(100vw-16px)] items-center gap-1 overflow-x-auto rounded-full border border-slate-200/60 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/95 select-none touch-none cursor-move"
      style={pos ? { left: pos.x, top: pos.y } : { right: 20, bottom: 356 }}
      onPointerDown={startDrag}
      onClickCapture={suppressClickAfterDrag}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={toolBtn(currentTool === tool.id)}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}

      <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-600" />

      <div className="flex shrink-0 items-center gap-1.5 px-0.5" aria-label="四種顏色">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`h-5 w-5 shrink-0 rounded-full border transition-transform hover:scale-110 ${
              currentColor === c ? "border-sky-500 scale-110 ring-2 ring-sky-300" : "border-slate-300 dark:border-slate-600"
            }`}
            style={{ backgroundColor: c }}
            title="顏色"
          />
        ))}
      </div>

      <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-600" />

      <button onClick={onUndo} className={toolBtn(false)} title="復原">
        <Undo2 className="h-4 w-4" />
      </button>
      <button onClick={onRedo} className={toolBtn(false)} title="重做">
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        onClick={onClear}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        title="清除"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="mx-0.5 h-6 w-px shrink-0 bg-slate-200 dark:bg-slate-600" />

      <button
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        title="關閉"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
