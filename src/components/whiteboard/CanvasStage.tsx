"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import {
  Pencil, Eraser, Square, Circle, Trash2, Undo2, Redo2
} from "lucide-react"
import { cn } from "@/lib/utils"

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
  onDirty?: () => void
  forceActive?: boolean
}

const COLORS = [
  { key: "black", color: "#1f2937" },
  { key: "red", color: "#dc2626" },
  { key: "blue", color: "#2563eb" },
  { key: "green", color: "#16a34a" },
  { key: "orange", color: "#ea580c" }
]

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark, onDirty, forceActive = false }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const pathsRef = useRef<ImageData[]>([])
  const pathIndexRef = useRef(-1)
  const currentPathRef = useRef<ImageData | null>(null)

  const [tool, setTool] = useState<CanvasTool>("pen")
  const [color, setColor] = useState(COLORS[0].color)
  const [isReady, setIsReady] = useState(false)

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    canvas.style.width = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = color
    ctx.lineWidth = tool === "eraser" ? 20 : 3

    ctxRef.current = ctx
    setIsReady(true)

    savePath()
  }, [color])

  const savePath = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    const imageData = ctx.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr)
    
    pathsRef.current = pathsRef.current.slice(0, pathIndexRef.current + 1)
    pathsRef.current.push(imageData)
    if (pathsRef.current.length > 50) pathsRef.current.shift()
    pathIndexRef.current = pathsRef.current.length - 1
    onDirty?.()
  }, [onDirty])

  const getPos = useCallback((e: PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }, [])

  useEffect(() => {
    initCanvas()

    const handleResize = () => {
      const canvas = canvasRef.current
      const container = containerRef.current
      if (!canvas || !container || !ctxRef.current) return

      const dpr = window.devicePixelRatio || 1
      const imageData = ctxRef.current.getImageData(0, 0, canvas.width / dpr, canvas.height / dpr)
      
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      
      ctxRef.current.scale(dpr, dpr)
      ctxRef.current.putImageData(imageData, 0, 0)
    }

    const ro = new ResizeObserver(handleResize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [initCanvas])

  useEffect(() => {
    if (!ctxRef.current) return
    ctxRef.current.strokeStyle = color
    ctxRef.current.lineWidth = tool === "eraser" ? 20 : 3
  }, [color, tool])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handlePointerDown = (e: PointerEvent) => {
      e.preventDefault()
      isDrawingRef.current = true
      const pos = getPos(e)
      startPosRef.current = pos
      canvas.setPointerCapture(e.pointerId)

      if (ctxRef.current) {
        ctxRef.current.beginPath()
        ctxRef.current.moveTo(pos.x, pos.y)
      }
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || !ctxRef.current) return
      e.preventDefault()

      const pos = getPos(e)

      if (tool === "pen" || tool === "eraser") {
        ctxRef.current.lineTo(pos.x, pos.y)
        ctxRef.current.stroke()
      }
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isDrawingRef.current || !ctxRef.current) return
      e.preventDefault()
      isDrawingRef.current = false

      const pos = getPos(e)

      if (tool === "rect") {
        ctxRef.current.strokeRect(
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
        ctxRef.current.beginPath()
        ctxRef.current.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
        ctxRef.current.stroke()
      }

      canvas.releasePointerCapture(e.pointerId)
      savePath()
    }

    canvas.addEventListener("pointerdown", handlePointerDown)
    canvas.addEventListener("pointermove", handlePointerMove)
    canvas.addEventListener("pointerup", handlePointerUp)
    canvas.addEventListener("pointerleave", handlePointerUp)

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown)
      canvas.removeEventListener("pointermove", handlePointerMove)
      canvas.removeEventListener("pointerup", handlePointerUp)
      canvas.removeEventListener("pointerleave", handlePointerUp)
    }
  }, [tool, getPos, savePath])

  useImperativeHandle(ref, (): CanvasApi => ({
    toJSON: () => {
      const canvas = canvasRef.current
      if (!canvas) return null
      return JSON.stringify({ tool, color, imageData: canvas.toDataURL() })
    },
    load: (json) => {
      const data = json as { imageData?: string }
      if (!data?.imageData || !ctxRef.current || !canvasRef.current) return
      const img = new Image()
      img.onload = () => {
        ctxRef.current!.drawImage(img, 0, 0)
      }
      img.src = data.imageData
    },
    toDataURL: () => canvasRef.current?.toDataURL("image/png") ?? null,
    isEmpty: () => pathIndexRef.current <= 0,
    clear: () => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return
      const dpr = window.devicePixelRatio || 1
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr)
      savePath()
    },
    undo: () => {
      if (pathIndexRef.current <= 0) return false
      pathIndexRef.current--
      const ctx = ctxRef.current
      const canvas = canvasRef.current
      if (!ctx || !canvas) return false
      const dpr = window.devicePixelRatio || 1
      ctx.putImageData(pathsRef.current[pathIndexRef.current], 0, 0)
      return true
    },
    redo: () => {
      if (pathIndexRef.current >= pathsRef.current.length - 1) return false
      pathIndexRef.current++
      const ctx = ctxRef.current
      const canvas = canvasRef.current
      if (!ctx || !canvas) return false
      const dpr = window.devicePixelRatio || 1
      ctx.putImageData(pathsRef.current[pathIndexRef.current], 0, 0)
      return true
    }
  }), [tool, color, savePath])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-white dark:bg-slate-800">
      <div ref={containerRef} className="h-full w-full">
        <canvas
          ref={canvasRef}
          className="touch-none"
          style={{ display: "block", background: dark ? "#1f1f1f" : "#ffffff" }}
        />
      </div>
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-2xl border border-black/10 bg-white/95 px-4 py-2 shadow-xl dark:border-white/20 dark:bg-slate-900/95">
        <button
          onClick={() => setTool("pen")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            tool === "pen" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
          title="畫筆"
        >
          <Pencil className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => setTool("eraser")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            tool === "eraser" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
          title="橡皮擦"
        >
          <Eraser className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => setTool("rect")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            tool === "rect" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
          title="方形"
        >
          <Square className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => setTool("ellipse")}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            tool === "ellipse" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          )}
          title="圓形"
        >
          <Circle className="h-5 w-5" />
        </button>

        <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

        {COLORS.map((c) => (
          <button
            key={c.key}
            onClick={() => setColor(c.color)}
            className={cn(
              "h-8 w-8 rounded-full border-2 border-white shadow transition-all hover:scale-110",
              color === c.color && "ring-2 ring-sky-500 ring-offset-2"
            )}
            style={{ backgroundColor: c.color }}
          />
        ))}

        <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

        <button
          onClick={() => (ref as any).current?.undo()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="復原"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => (ref as any).current?.redo()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          title="重做"
        >
          <Redo2 className="h-5 w-5" />
        </button>
        
        <button
          onClick={() => (ref as any).current?.clear()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="清空"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
})
