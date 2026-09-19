"use client"

import { useEffect, useRef, useState } from "react"
import { Pencil, Eraser, Square, Circle, Minus, Type, Highlighter, Move, Undo2, Redo2, Trash2, X } from "lucide-react"
import type { CanvasTool } from "./CanvasStage"

interface Props {
  currentTool: CanvasTool
  onToolChange: (tool: CanvasTool) => void
  onColorChange: (color: string) => void
  currentColor: string
  brushSize: number
  onBrushSizeChange: (size: number) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
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

export function CanvasToolbar({ currentTool, onToolChange, onColorChange, currentColor, brushSize, onBrushSizeChange, onUndo, onRedo, onClear, onClose }: Props) {
  const [pos, setPos] = useState<{ right: number; y: number } | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const draggedRef = useRef(false)
  const mountedRef = useRef(false)
  const brushSizes = [3, 8, 16]

  useEffect(() => {
    mountedRef.current = true
    const place = () => {
      const header = document.querySelector("header")
      const headerBottom = header ? header.getBoundingClientRect().bottom + 12 : 56
      if (mountedRef.current) setPos({ right: 20, y: headerBottom })
    }
    place()
    window.addEventListener("resize", place)
    return () => {
      mountedRef.current = false
      window.removeEventListener("resize", place)
    }
  }, [])

  const startDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return
    const rect = barRef.current!.getBoundingClientRect()
    dragRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top }
    draggedRef.current = false
  }

  useEffect(() => {
    mountedRef.current = true
    const moveDrag = (e: PointerEvent) => {
      if (!dragRef.current || !barRef.current || !mountedRef.current) return
      const w = barRef.current.offsetWidth
      const h = barRef.current.offsetHeight
      const vw = window.innerWidth
      const right = Math.max(4, vw - (e.clientX - dragRef.current.dx) - w)
      const clampedRight = clamp(right, 4, vw - 4)
      setPos({
        right: clampedRight,
        y: clamp(e.clientY - dragRef.current.dy, 4, window.innerHeight - h - 4)
      })
      draggedRef.current = true
    }
    const endDrag = () => { dragRef.current = null }
    window.addEventListener("pointermove", moveDrag)
    window.addEventListener("pointerup", endDrag)
    window.addEventListener("pointercancel", endDrag)
    return () => {
      mountedRef.current = false
      window.removeEventListener("pointermove", moveDrag)
      window.removeEventListener("pointerup", endDrag)
      window.removeEventListener("pointercancel", endDrag)
    }
  }, [])

  const suppressClickAfterDrag = (e: React.MouseEvent) => {
    if (draggedRef.current && !(e.target as HTMLElement).closest("button")) {
      e.preventDefault()
      e.stopPropagation()
      draggedRef.current = false
    }
  }

  const toolBtn = (active: boolean) =>
    `flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all ${
      active ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="畫布工具"
      className="fixed z-50 flex max-h-[calc(100vh-200px)] min-h-0 flex-col items-center gap-1 overflow-y-auto rounded-full border border-slate-200/60 bg-white/95 py-1.5 px-1.5 shadow-lg backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/95 select-none touch-none cursor-move"
      style={pos ? { right: pos.right, top: pos.y } : { right: 20, top: 16 }}
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

      <div className="my-0.5 h-px w-5 shrink-0 bg-slate-200 dark:bg-slate-600" />

      <div className="flex shrink-0 flex-col items-center gap-1 py-0.5" aria-label="四種顏色">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            className={`h-4 w-4 shrink-0 rounded-full border transition-transform hover:scale-110 ${
              currentColor === c ? "border-sky-500 scale-110 ring-2 ring-sky-300" : "border-slate-300 dark:border-slate-600"
            }`}
            style={{ backgroundColor: c }}
            title="顏色"
          />
        ))}
      </div>

      <div className="my-0.5 h-px w-5 shrink-0 bg-slate-200 dark:bg-slate-600" />

      <div className="flex shrink-0 flex-col items-center gap-1 py-0.5" aria-label="筆刷粗細">
        {brushSizes.map((s) => (
          <button
            key={s}
            onClick={() => onBrushSizeChange(s)}
            className={`rounded-full border transition-all hover:scale-110 ${
              brushSize === s ? "border-sky-500 ring-2 ring-sky-300" : "border-slate-300 dark:border-slate-600"
            }`}
            style={{ width: s + 4, height: s + 4, backgroundColor: currentColor }}
            title={`筆刷 ${s}px`}
          />
        ))}
      </div>

      <div className="my-0.5 h-px w-5 shrink-0 bg-slate-200 dark:bg-slate-600" />

      <button onClick={onUndo} className={toolBtn(false)} title="復原">
        <Undo2 className="h-4 w-4" />
      </button>
      <button onClick={onRedo} className={toolBtn(false)} title="重做">
        <Redo2 className="h-4 w-4" />
      </button>
      <button
        onClick={onClear}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        title="清除"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      <div className="my-0.5 h-px w-5 shrink-0 bg-slate-200 dark:bg-slate-600" />

      <button
        onClick={onClose}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
        title="關閉"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
