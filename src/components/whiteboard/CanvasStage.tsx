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

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark, onDirty }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const isDrawingRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })
  const pathsRef = useRef<ImageData[]>([])
  const pathIndexRef = useRef(-1)

  const [tool, setTool] = useState<CanvasTool>("pen")
  const [color, setColor] = useState(COLORS[0].color)

  const savePath = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!canvas || !ctx) return
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
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
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = color
    ctx.lineWidth = tool === "eraser" ? 20 : 3

    ctxRef.current = ctx
    savePath()
  }, [color, tool, savePath])

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
      return JSON.stringify({ imageData: canvas.toDataURL() })
    },
    load: (json) => {
      const data = json as { imageData?: string }
      if (!data?.imageData || !ctxRef.current || !canvasRef.current) return
      const img = new Image()
      img.onload = () => {
        ctxRef.current!.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height)
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
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      savePath()
    },
    undo: () => {
      if (pathIndexRef.current <= 0) return false
      pathIndexRef.current--
      const ctx = ctxRef.current
      if (!ctx) return false
      ctx.putImageData(pathsRef.current[pathIndexRef.current], 0, 0)
      return true
    },
    redo: () => {
      if (pathIndexRef.current >= pathsRef.current.length - 1) return false
      pathIndexRef.current++
      const ctx = ctxRef.current
      if (!ctx) return false
      ctx.putImageData(pathsRef.current[pathIndexRef.current], 0, 0)
      return true
    }
  }), [savePath])

  return (
    <div className="flex h-full w-full flex-col rounded-3xl bg-white dark:bg-slate-800">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
        <button
          onClick={() => setTool("pen")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
            tool === "pen" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
          title="畫筆"
        >
          <Pencil className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setTool("eraser")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
            tool === "eraser" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
          title="橡皮擦"
        >
          <Eraser className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setTool("rect")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
            tool === "rect" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
          title="方形"
        >
          <Square className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => setTool("ellipse")}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg transition-all",
            tool === "ellipse" ? "bg-sky-500 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          )}
          title="圓形"
        >
          <Circle className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-600" />

        {COLORS.map((c) => (
          <button
            key={c.key}
            onClick={() => setColor(c.color)}
            className={cn(
              "h-7 w-7 rounded-full border-2 border-white shadow transition-all hover:scale-110",
              color === c.color && "ring-2 ring-sky-500 ring-offset-2"
            )}
            style={{ backgroundColor: c.color }}
          />
        ))}

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-600" />

        <button
          onClick={() => (ref as any).current?.undo()}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          title="復原"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => (ref as any).current?.redo()}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          title="重做"
        >
          <Redo2 className="h-4 w-4" />
        </button>
        
        <button
          onClick={() => (ref as any).current?.clear()}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
          title="清空"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          className="touch-none w-full h-full"
          style={{ display: "block", background: dark ? "#1f1f1f" : "#ffffff" }}
        />
      </div>
    </div>
  )
})
