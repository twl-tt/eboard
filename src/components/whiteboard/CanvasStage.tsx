"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import { X, Pencil, Eraser, Square, Circle, Trash2, Undo2, Redo2, Minus, Highlighter } from "lucide-react"

export type CanvasTool = "pen" | "eraser" | "rect" | "ellipse" | "line" | "highlighter"

export interface CanvasApi {
  toJSON: () => string | null
  load: (data: string | null) => void
  toDataURL: () => string | null
  isEmpty: () => boolean
  clear: () => void
  undo: () => boolean
  redo: () => boolean
}

interface Props {
  articleId: string
  boardColor: string | null
  containerRef: React.RefObject<HTMLDivElement>
}

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, boardColor, containerRef }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const historyRef = useRef<ImageData[]>([])
  const historyIndexRef = useRef(-1)
  const toolRef = useRef<CanvasTool>("pen")
  const colorRef = useRef("#dc2626")

  const [tool, setTool] = useState<CanvasTool>("pen")
  const [color, setColor] = useState("#dc2626")
  const [visible, setVisible] = useState(true)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])

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

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    let w = 0, h = 0
    if (container) {
      const rect = container.getBoundingClientRect()
      w = rect.width
      h = rect.height
    } else {
      w = window.innerWidth
      h = window.innerHeight
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    ctx.strokeStyle = colorRef.current
    ctx.lineWidth = toolRef.current === "eraser" ? 20 : 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctxRef.current = ctx

    if (boardColor) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = boardColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.putImageData(imageData, 0, 0)
    }

    saveHistory()
  }, [containerRef, saveHistory])

  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = colorRef.current
      ctxRef.current.lineWidth = toolRef.current === "eraser" ? 20 : 3
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
      const currentTool = toolRef.current
      if (currentTool === "pen" || currentTool === "eraser" || currentTool === "highlighter") {
        ctxRef.current?.beginPath()
        ctxRef.current?.moveTo(pos.x, pos.y)
        if (currentTool === "highlighter") {
          ctxRef.current!.globalAlpha = 0.1
          ctxRef.current!.lineWidth = 25
        } else if (currentTool === "eraser") {
          ctxRef.current!.globalAlpha = 1
          ctxRef.current!.globalCompositeOperation = "destination-out"
          ctxRef.current!.lineWidth = 20
        } else {
          ctxRef.current!.globalAlpha = 1
          ctxRef.current!.globalCompositeOperation = "source-over"
          ctxRef.current!.strokeStyle = colorRef.current
          ctxRef.current!.lineWidth = 3
        }
      }
    }

    const onMove = (e: PointerEvent | TouchEvent) => {
      if (!isDrawingRef.current || !ctxRef.current) return
      e.preventDefault()
      const pos = getPos(e)
      const currentTool = toolRef.current
      if (currentTool === "pen" || currentTool === "eraser" || currentTool === "highlighter") {
        if (currentTool === "highlighter") {
          ctxRef.current.globalAlpha = 0.1
          ctxRef.current.lineWidth = 25
        } else if (currentTool === "eraser") {
          ctxRef.current.globalCompositeOperation = "destination-out"
          ctxRef.current.lineWidth = 20
        } else {
          ctxRef.current.globalCompositeOperation = "source-over"
          ctxRef.current.strokeStyle = colorRef.current
          ctxRef.current.lineWidth = 3
        }
        ctxRef.current.lineTo(pos.x, pos.y)
        ctxRef.current.stroke()
      }
    }

    const onUp = (e: PointerEvent | TouchEvent) => {
      if (!isDrawingRef.current) return
      e.preventDefault()
      isDrawingRef.current = false
      const pos = getPos(e)
      if ("releasePointerCapture" in canvas) {
        try { canvas.releasePointerCapture(("pointerId" in e ? e.pointerId : 0) as number) } catch {}
      }

      const currentTool = toolRef.current
      if (currentTool === "rect") {
        ctxRef.current?.strokeRect(
          startPosRef.current.x,
          startPosRef.current.y,
          pos.x - startPosRef.current.x,
          pos.y - startPosRef.current.y
        )
      } else if (currentTool === "ellipse") {
        const cx = (startPosRef.current.x + pos.x) / 2
        const cy = (startPosRef.current.y + pos.y) / 2
        const rx = Math.abs(pos.x - startPosRef.current.x) / 2
        const ry = Math.abs(pos.y - startPosRef.current.y) / 2
        ctxRef.current?.beginPath()
        ctxRef.current?.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctxRef.current?.stroke()
      } else if (currentTool === "line") {
        ctxRef.current?.beginPath()
        ctxRef.current?.moveTo(startPosRef.current.x, startPosRef.current.y)
        ctxRef.current?.lineTo(pos.x, pos.y)
        ctxRef.current?.stroke()
      }

      saveHistory()
      ctxRef.current!.globalAlpha = 1
      ctxRef.current!.globalCompositeOperation = "source-over"
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
  }, [saveHistory])

  useImperativeHandle(ref, () => ({
    toJSON: () => canvasRef.current?.toDataURL() ?? null,
    load: (data: string | null) => {
      if (!data || !canvasRef.current || !ctxRef.current) return
      const img = new Image()
      img.onload = () => {
        ctxRef.current?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
        ctxRef.current?.drawImage(img, 0, 0)
      }
      img.src = data
    },
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

  const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#eab308"]

  if (!visible) return null

  return (
    <>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-auto z-40"
        style={{ background: "transparent" }}
      />
      <div className="absolute top-0 left-2 flex items-center gap-0.5 rounded-lg border border-slate-200/50 bg-white/90 px-2 py-1 shadow-md dark:border-slate-700/50 dark:bg-slate-900/90 z-50 overflow-x-auto max-w-[calc(100vw-16px)]">
        <button onClick={() => setVisible(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          <X size={14} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        <button onClick={() => setTool("pen")} className={`p-1 rounded ${tool === "pen" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`}>
          <Pencil size={14} />
        </button>
        <button onClick={() => setTool("eraser")} className={`p-1 rounded ${tool === "eraser" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`}>
          <Eraser size={14} />
        </button>
        <button onClick={() => setTool("rect")} className={`p-1 rounded ${tool === "rect" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`}>
          <Square size={14} />
        </button>
        <button onClick={() => setTool("ellipse")} className={`p-1 rounded ${tool === "ellipse" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`}>
          <Circle size={14} />
        </button>
        <button onClick={() => setTool("line")} className={`p-1 rounded ${tool === "line" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`}>
          <Minus size={14} />
        </button>
        <button onClick={() => setTool("highlighter")} className={`p-1 rounded ${tool === "highlighter" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="螢光筆">
          <Highlighter size={14} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        {COLORS.map(c => (
          <button key={c} onClick={() => setColor(c)} className={`w-4 h-4 rounded-full border-2 ${color === c ? "border-sky-500" : "border-slate-200"}`} style={{ backgroundColor: c }} />
        ))}
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        <button onClick={() => (ref as any)?.current?.undo()} className="p-1 rounded hover:bg-slate-100">
          <Undo2 size={14} />
        </button>
        <button onClick={() => (ref as any)?.current?.redo()} className="p-1 rounded hover:bg-slate-100">
          <Redo2 size={14} />
        </button>
        <button onClick={() => (ref as any)?.current?.clear()} className="p-1 rounded hover:bg-red-50 text-red-400">
          <Trash2 size={14} />
        </button>
      </div>
    </>
  )
})
