"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import { Pencil, Eraser, Square, Circle, Trash2, Undo2, Redo2 } from "lucide-react"

export type CanvasTool = "pen" | "eraser" | "rect" | "ellipse"

export interface CanvasApi {
  toJSON: () => string | null
  load: (json: unknown) => void
  toDataURL: () => string | null
  isEmpty: () => boolean
  clear: () => void
  undo: () => boolean
  redo: () => boolean
}

interface Props {
  articleId: string
  dark: boolean
}

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef(-1)

  const [tool, setTool] = useState<CanvasTool>("pen")
  const [color, setColor] = useState("#1f2937")

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
    historyRef.current.push(imageData)
    if (historyRef.current.length > 30) historyRef.current.shift()
    historyIndexRef.current = historyRef.current.length - 1
  }, [])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.strokeStyle = color
    ctx.lineWidth = tool === "eraser" ? 20 : 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctxRef.current = ctx
    saveHistory()
  }, [color, tool, saveHistory])

  useEffect(() => {
    initCanvas()
    window.addEventListener("resize", initCanvas)
    return () => window.removeEventListener("resize", initCanvas)
  }, [initCanvas])

  useEffect(() => {
    if (!ctxRef.current) return
    ctxRef.current.strokeStyle = color
    ctxRef.current.lineWidth = tool === "eraser" ? 20 : 3
  }, [color, tool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onDown = (e: PointerEvent) => {
      isDrawingRef.current = true
      const pos = getPos(e)
      startPosRef.current = pos
      canvas.setPointerCapture(e.pointerId)
      ctxRef.current?.beginPath()
      ctxRef.current?.moveTo(pos.x, pos.y)
    }

    const onMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || !ctxRef.current) return
      const pos = getPos(e)
      ctxRef.current.lineTo(pos.x, pos.y)
      ctxRef.current.stroke()
    }

    const onUp = (e: PointerEvent) => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      const pos = getPos(e)
      canvas.releasePointerCapture(e.pointerId)

      if (tool === "rect") {
        ctxRef.current?.strokeRect(
          startPosRef.current.x,
          startPosRef.current.y,
          pos.x - startPosRef.current.x,
          pos.y - startPosRef.current.y
        )
      } else if (tool === "ellipse") {
        const cx = (startPosRef.current.x + pos.x) / 2
        const cy = (startPosRef.current.y + pos.y) / 2
        const rx = Math.abs(pos.x - startPosRef.current.x) / 2
        const ry = Math.abs(pos.y - startPosRef.current.y) / 2
        ctxRef.current?.beginPath()
        ctxRef.current?.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctxRef.current?.stroke()
      }

      saveHistory()
    }

    canvas.addEventListener("pointerdown", onDown)
    canvas.addEventListener("pointermove", onMove)
    canvas.addEventListener("pointerup", onUp)

    return () => {
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
    }
  }, [tool, saveHistory])

  useImperativeHandle(ref, () => ({
    toJSON: () => canvasRef.current?.toDataURL() ?? null,
    load: () => {},
    toDataURL: () => canvasRef.current?.toDataURL() ?? null,
    isEmpty: () => historyIndexRef.current <= 0,
    clear: () => {
      const ctx = ctxRef.current
      const canvas = canvasRef.current
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      saveHistory()
    },
    undo: () => {
      if (historyIndexRef.current <= 0) return false
      historyIndexRef.current--
      ctxRef.current?.putImageData(historyRef.current[historyIndexRef.current], 0, 0)
      return true
    },
    redo: () => {
      if (historyIndexRef.current >= historyRef.current.length - 1) return false
      historyIndexRef.current++
      ctxRef.current?.putImageData(historyRef.current[historyIndexRef.current], 0, 0)
      return true
    }
  }), [saveHistory])

  const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c"]

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2 dark:border-slate-700 dark:bg-slate-900">
        <button onClick={() => setTool("pen")} className={`p-2 rounded ${tool === "pen" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Pencil size={18} />
        </button>
        <button onClick={() => setTool("eraser")} className={`p-2 rounded ${tool === "eraser" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Eraser size={18} />
        </button>
        <button onClick={() => setTool("rect")} className={`p-2 rounded ${tool === "rect" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Square size={18} />
        </button>
        <button onClick={() => setTool("ellipse")} className={`p-2 rounded ${tool === "ellipse" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Circle size={18} />
        </button>
        <div className="w-px h-6 bg-slate-300 mx-1" />
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-sky-500 ring-2 ring-sky-500 ring-offset-1" : "border-white"}`} style={{ backgroundColor: c }} />
        ))}
        <div className="w-px h-6 bg-slate-300 mx-1" />
        <button onClick={() => (ref as any)?.current?.undo()} className="p-2 rounded hover:bg-slate-200">
          <Undo2 size={18} />
        </button>
        <button onClick={() => (ref as any)?.current?.redo()} className="p-2 rounded hover:bg-slate-200">
          <Redo2 size={18} />
        </button>
        <button onClick={() => (ref as any)?.current?.clear()} className="p-2 rounded hover:bg-red-100 text-red-500">
          <Trash2 size={18} />
        </button>
      </div>
      <div className="flex-1 min-h-0">
        <canvas
          ref={canvasRef}
          className="block w-full h-full"
          style={{ background: dark ? "#1f1f1f" : "#ffffff" }}
        />
      </div>
    </div>
  )
})
