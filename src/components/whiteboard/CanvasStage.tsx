"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import { X, Pencil, Eraser, Square, Circle, Trash2, Undo2, Redo2 } from "lucide-react"

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
  containerRef: React.RefObject<HTMLDivElement>
}

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark, containerRef }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef(-1)

  const [tool, setTool] = useState<CanvasTool>("pen")
  const [color, setColor] = useState("#1f2937")
  const [visible, setVisible] = useState(true)

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

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef?.current
    if (!canvas) return

    const init = () => {
      if (container) {
        const rect = container.getBoundingClientRect()
        canvas.width = rect.width
        canvas.height = rect.height
      } else {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.strokeStyle = color
        ctx.lineWidth = tool === "eraser" ? 20 : 3
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        if (!container) {
          ctx.fillStyle = "#1f1f1f"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
        } else {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
        }
        ctxRef.current = ctx
        saveHistory()
      }
    }

    init()

    if (container) {
      const ro = new ResizeObserver(init)
      ro.observe(container)
      return () => ro.disconnect()
    } else {
      window.addEventListener("resize", init)
      return () => window.removeEventListener("resize", init)
    }
  }, [color, tool, containerRef, saveHistory])

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color
      ctxRef.current.lineWidth = tool === "eraser" ? 20 : 3
    }
  }, [color, tool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const getPos = (e: PointerEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      if ("touches" in e && e.touches.length > 0) {
        return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
      }
      if ("clientX" in e) {
        return { x: e.clientX - rect.left, y: e.clientY - rect.top }
      }
      return { x: 0, y: 0 }
    }

    const onDown = (e: PointerEvent | TouchEvent) => {
      e.preventDefault()
      isDrawingRef.current = true
      const pos = getPos(e)
      startPosRef.current = pos
      if ("setPointerCapture" in canvas) {
        try { canvas.setPointerCapture(("pointerId" in e ? e.pointerId : 0) as number) } catch {}
      }
      ctxRef.current?.beginPath()
      ctxRef.current?.moveTo(pos.x, pos.y)
    }

    const onMove = (e: PointerEvent | TouchEvent) => {
      if (!isDrawingRef.current || !ctxRef.current) return
      e.preventDefault()
      const pos = getPos(e)
      ctxRef.current.lineTo(pos.x, pos.y)
      ctxRef.current.stroke()
    }

    const onUp = (e: PointerEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      isDrawingRef.current = false
      const pos = getPos(e)
      if ("releasePointerCapture" in canvas) {
        try { canvas.releasePointerCapture(("pointerId" in e ? e.pointerId : 0) as number) } catch {}
      }

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
    canvas.addEventListener("pointerleave", onUp)
    canvas.addEventListener("touchstart", onDown, { passive: false })
    canvas.addEventListener("touchmove", onMove, { passive: false })
    canvas.addEventListener("touchend", onUp)

    return () => {
      canvas.removeEventListener("pointerdown", onDown)
      canvas.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("pointerup", onUp)
      canvas.removeEventListener("pointerleave", onUp)
      canvas.removeEventListener("touchstart", onDown)
      canvas.removeEventListener("touchmove", onMove)
      canvas.removeEventListener("touchend", onUp)
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

  if (!visible) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto z-40"
        style={{ background: "transparent" }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg dark:border-slate-700 dark:bg-slate-900/95 z-50">
        <button onClick={() => setVisible(false)} className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
          <X size={16} />
        </button>
        <button onClick={() => setTool("pen")} className={`p-1.5 rounded ${tool === "pen" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Pencil size={16} />
        </button>
        <button onClick={() => setTool("eraser")} className={`p-1.5 rounded ${tool === "eraser" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Eraser size={16} />
        </button>
        <button onClick={() => setTool("rect")} className={`p-1.5 rounded ${tool === "rect" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Square size={16} />
        </button>
        <button onClick={() => setTool("ellipse")} className={`p-1.5 rounded ${tool === "ellipse" ? "bg-sky-500 text-white" : "hover:bg-slate-200"}`}>
          <Circle size={16} />
        </button>
        <div className="w-px h-5 bg-slate-300" />
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 ${color === c ? "border-sky-500" : "border-white"}`} style={{ backgroundColor: c }} />
        ))}
        <div className="w-px h-5 bg-slate-300" />
        <button onClick={() => (ref as any)?.current?.undo()} className="p-1.5 rounded hover:bg-slate-200">
          <Undo2 size={16} />
        </button>
        <button onClick={() => (ref as any)?.current?.redo()} className="p-1.5 rounded hover:bg-slate-200">
          <Redo2 size={16} />
        </button>
        <button onClick={() => (ref as any)?.current?.clear()} className="p-1.5 rounded hover:bg-red-100 text-red-500">
          <Trash2 size={16} />
        </button>
      </div>
    </>
  )
})
