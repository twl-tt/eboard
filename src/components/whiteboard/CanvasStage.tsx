"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import {
  MousePointer2, Pencil, Highlighter, Eraser, Square, Circle, Type, ImagePlus, Undo2, Redo2, Trash2, Hand, Minimize2, Maximize2, Eye, EyeOff, X
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CanvasTool = "select" | "pen" | "hl" | "eraser" | "rect" | "ellipse" | "text" | "pan"
export type CanvasMode = "hidden" | "overlay" | "fullscreen"

export interface CanvasApi {
  toJSON: () => string | null
  load: (json: unknown) => void
  toDataURL: () => string | null
  isEmpty: () => boolean
  clear: () => void
  undo: () => boolean
  redo: () => boolean
  addSticker: (text: string, color?: string) => void
}

interface Props {
  articleId: string
  dark: boolean
  onDirty?: () => void
  followsText?: boolean
  scrollContainerRef?: React.RefObject<HTMLDivElement> | null
  forceActive?: boolean
  canvasTopOffset?: number
  drawMode?: boolean
  onDrawModeChange?: (mode: boolean) => void
}

const HL_COLORS = [
  { key: "yellow", rgba: "rgba(250,204,21,0.55)" },
  { key: "green", rgba: "rgba(74,222,128,0.55)" },
  { key: "pink", rgba: "rgba(244,114,182,0.55)" },
  { key: "blue", rgba: "rgba(96,165,250,0.55)" },
  { key: "orange", rgba: "rgba(249,115,22,0.55)" }
]

const PEN_COLORS = [
  { key: "black", color: "#1f2937" },
  { key: "white", color: "#f9fafb" },
  { key: "red", color: "#dc2626" },
  { key: "blue", color: "#2563eb" },
  { key: "green", color: "#16a34a" },
  { key: "orange", color: "#ea580c" }
]

const TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { tool: "select", icon: <MousePointer2 className="h-5 w-5" />, label: "選擇" },
  { tool: "pan", icon: <Hand className="h-5 w-5" />, label: "拖曳" },
  { tool: "pen", icon: <Pencil className="h-5 w-5" />, label: "畫筆" },
  { tool: "hl", icon: <Highlighter className="h-5 w-5" />, label: "螢光筆" },
  { tool: "eraser", icon: <Eraser className="h-5 w-5" />, label: "橡皮擦" },
  { tool: "rect", icon: <Square className="h-5 w-5" />, label: "方形" },
  { tool: "ellipse", icon: <Circle className="h-5 w-5" />, label: "圓形" },
  { tool: "text", icon: <Type className="h-5 w-5" />, label: "文字" }
]

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark, onDirty, followsText = false, scrollContainerRef = null, forceActive = false, canvasTopOffset = 0, drawMode = false, onDrawModeChange }, ref) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const fabricLibRef = useRef<any>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isLoadingRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const toolRef = useRef<CanvasTool>("select")
  const penColorRef = useRef(PEN_COLORS[0].color)
  const hlColorRef = useRef(HL_COLORS[0].rgba)

  const [canvasMode, setCanvasMode] = useState<CanvasMode>("overlay")
  const [tool, setTool] = useState<CanvasTool>("select")
  const [penColor, setPenColor] = useState(PEN_COLORS[0].color)
  const [hlColor, setHlColor] = useState(HL_COLORS[0].rgba)
  const [initialized, setInitialized] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)

  toolRef.current = tool
  penColorRef.current = penColor
  hlColorRef.current = hlColor

  const initCanvas = useCallback(() => {
    if (fabricRef.current || !canvasElRef.current || !containerRef.current) return

    const container = containerRef.current
    const fabric = fabricLibRef.current
    if (!fabric) return

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "transparent",
      selection: true,
      preserveObjectStacking: true
    })

    fabricRef.current = canvas

    const saveHistory = () => {
      if (isLoadingRef.current) return
      const json = JSON.stringify(canvas.toJSON())
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
      historyRef.current.push(json)
      if (historyRef.current.length > 50) historyRef.current.shift()
      historyIndexRef.current = historyRef.current.length - 1
      onDirty?.()
    }

    canvas.on("object:added", saveHistory)
    canvas.on("object:modified", saveHistory)
    canvas.on("object:removed", saveHistory)

    canvas.on("path:created", saveHistory)

    setInitialized(true)
  }, [onDirty])

  const setupTool = useCallback(() => {
    const canvas = fabricRef.current
    const fabric = fabricLibRef.current
    if (!canvas || !fabric) return

    canvas.isDrawingMode = false
    canvas.selection = toolRef.current === "select"
    canvas.defaultCursor = toolRef.current === "pan" ? "grab" : "default"

    canvas.forEachObject((obj: any) => {
      if (obj._isDrawingShape || obj._isSticker) return
      obj.selectable = toolRef.current === "select" || toolRef.current === "pan"
      obj.evented = toolRef.current === "select" || toolRef.current === "pan" || toolRef.current === "eraser"
    })

    if (toolRef.current === "pen") {
      canvas.isDrawingMode = true
      canvas.selection = false
      const brush = new fabric.PencilBrush(canvas)
      brush.color = penColorRef.current
      brush.width = 4
      canvas.freeDrawingBrush = brush
    }

    if (toolRef.current === "hl") {
      canvas.isDrawingMode = true
      canvas.selection = false
      const brush = new fabric.PencilBrush(canvas)
      brush.color = hlColorRef.current
      brush.width = 30
      canvas.freeDrawingBrush = brush
    }

    canvas.renderAll()
  }, [])

  useEffect(() => {
    if (canvasMode === "hidden") {
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
      setInitialized(false)
      return
    }

    const init = async () => {
      if (!fabricLibRef.current) {
        const mod = await import("fabric")
        const f: any = (mod as any).fabric ?? (mod as any).default ?? mod
        fabricLibRef.current = f
        ;(window as any).fabric = f
      }
      initCanvas()
    }

    init()
  }, [canvasMode, initCanvas])

  useEffect(() => {
    if (!initialized) return
    setupTool()
  }, [tool, initialized, setupTool])

  useEffect(() => {
    if (!initialized) return
    setupTool()
  }, [hlColor, setupTool])

  useEffect(() => {
    if (!initialized) return
    setupTool()
  }, [penColor, setupTool])

  useEffect(() => {
    if (!initialized || !containerRef.current) return

    const handleResize = () => {
      if (!fabricRef.current || !containerRef.current) return
      const el = containerRef.current
      fabricRef.current.setDimensions({
        width: el.scrollWidth,
        height: el.scrollHeight
      })
    }

    handleResize()

    const ro = new ResizeObserver(handleResize)
    ro.observe(containerRef.current)

    return () => ro.disconnect()
  }, [initialized])

  useEffect(() => {
    if (!initialized || !fabricRef.current || !fabricLibRef.current) return

    const canvas = fabricRef.current
    const fabric = fabricLibRef.current

    let isDrawing = false
    let startX = 0, startY = 0

    const handleMouseDown = (opt: any) => {
      if (toolRef.current === "eraser") {
        const target = canvas.findTarget(opt.e)
        if (target && target !== canvas.backgroundImage) {
          canvas.remove(target)
        }
        return
      }

      if (toolRef.current !== "rect" && toolRef.current !== "ellipse") return
      if (opt.target) return

      isDrawing = true
      const pointer = canvas.getPointer(opt.e)
      startX = pointer.x
      startY = pointer.y

      const common = {
        left: startX,
        top: startY,
        width: 1,
        height: 1,
        fill: "transparent",
        stroke: penColorRef.current,
        strokeWidth: 3
      }

      const shape = toolRef.current === "rect"
        ? new fabric.Rect(common)
        : new fabric.Ellipse({ ...common, rx: 1, ry: 1 })
      ;(shape as any)._isDrawingShape = true
      canvas.add(shape)
    }

    const handleMouseMove = (opt: any) => {
      if (!isDrawing) return
      if (toolRef.current !== "rect" && toolRef.current !== "ellipse") return

      const pointer = canvas.getPointer(opt.e)
      const shapes = canvas.getObjects().filter((o: any) => o._isDrawingShape)
      const shape = shapes[shapes.length - 1]
      if (!shape) return

      const left = Math.min(startX, pointer.x)
      const top = Math.min(startY, pointer.y)
      const width = Math.abs(pointer.x - startX)
      const height = Math.abs(pointer.y - startY)

      if (toolRef.current === "rect") {
        shape.set({ left, top, width, height })
      } else {
        shape.set({ left, top, rx: width / 2, ry: height / 2 })
      }
      canvas.renderAll()
    }

    const handleMouseUp = () => {
      if (!isDrawing) return
      isDrawing = false

      const shapes = canvas.getObjects().filter((o: any) => o._isDrawingShape)
      if (shapes.length > 0) {
        const shape = shapes[shapes.length - 1]
        ;(shape as any)._isDrawingShape = false
        shape.setCoords()
      }
    }

    const handleDblClick = (opt: any) => {
      if (toolRef.current !== "text") return

      const pointer = canvas.getPointer(opt.e)
      const text = new fabric.IText("", {
        left: pointer.x,
        top: pointer.y,
        fontSize: 28,
        fill: penColorRef.current,
        fontFamily: "system-ui, sans-serif"
      })
      canvas.add(text)
      canvas.setActiveObject(text)
      text.enterEditing()
    }

    canvas.on("mouse:down", handleMouseDown)
    canvas.on("mouse:move", handleMouseMove)
    canvas.on("mouse:up", handleMouseUp)
    canvas.on("mouse:dblclick", handleDblClick)

    return () => {
      canvas.off("mouse:down", handleMouseDown)
      canvas.off("mouse:move", handleMouseMove)
      canvas.off("mouse:up", handleMouseUp)
      canvas.off("mouse:dblclick", handleDblClick)
    }
  }, [initialized, dark])

  useImperativeHandle(ref, (): CanvasApi => ({
    toJSON: () => {
      try {
        return JSON.stringify(fabricRef.current?.toJSON() ?? null)
      } catch { return null }
    },
    load: (json) => {
      if (!fabricRef.current || !json) return
      isLoadingRef.current = true
      fabricRef.current.loadFromJSON(json, () => {
        fabricRef.current.renderAll()
        isLoadingRef.current = false
      })
    },
    toDataURL: () => {
      try {
        return fabricRef.current?.toDataURL({ format: "png", multiplier: 2 }) ?? null
      } catch { return null }
    },
    isEmpty: () => (fabricRef.current?.getObjects().length ?? 0) === 0,
    clear: () => {
      if (!fabricRef.current) return
      fabricRef.current.getObjects().forEach((o: any) => {
        if (!o._isDrawingShape) fabricRef.current.remove(o)
      })
      fabricRef.current.renderAll()
    },
    undo: () => {
      if (historyIndexRef.current <= 0) return false
      historyIndexRef.current--
      const json = historyRef.current[historyIndexRef.current]
      if (!json || !fabricRef.current) return false
      isLoadingRef.current = true
      fabricRef.current.loadFromJSON(json, () => {
        fabricRef.current.renderAll()
        isLoadingRef.current = false
      })
      return true
    },
    redo: () => {
      if (historyIndexRef.current >= historyRef.current.length - 1) return false
      historyIndexRef.current++
      const json = historyRef.current[historyIndexRef.current]
      if (!json || !fabricRef.current) return false
      isLoadingRef.current = true
      fabricRef.current.loadFromJSON(json, () => {
        fabricRef.current.renderAll()
        isLoadingRef.current = false
      })
      return true
    },
    addSticker: (text: string, color = "#a78bfa") => {
      if (!fabricRef.current || !fabricLibRef.current) return
      const fabric = fabricLibRef.current
      const canvas = fabricRef.current
      const count = canvas.getObjects().length
      const x = 80 + (count % 6) * 50
      const y = 80 + (count % 6) * 50
      const bg = new fabric.Rect({
        left: 0, top: 0, width: 130, height: 48, rx: 14, ry: 14,
        fill: color, stroke: "rgba(255,255,255,0.6)", strokeWidth: 2
      })
      const label = new fabric.Text(text, {
        left: 65, top: 24, originX: "center", originY: "center",
        fontSize: 18, fontFamily: "system-ui", fontWeight: "bold", fill: "#ffffff"
      })
      const group = new fabric.Group([bg, label], { left: x, top: y, selectable: true })
      ;(group as any)._isSticker = true
      canvas.add(group)
      canvas.setActiveObject(group)
      canvas.renderAll()
    }
  }), [])

  const cycleMode = () => {
    if (canvasMode === "hidden") {
      setCanvasMode("overlay")
      onDrawModeChange?.(true)
    }
    else if (canvasMode === "overlay") {
      setCanvasMode("fullscreen")
      onDrawModeChange?.(true)
    }
    else {
      setCanvasMode("hidden")
      onDrawModeChange?.(false)
    }
  }

  const uploadImage = async (file: File) => {
    if (!fabricRef.current || !fabricLibRef.current) return
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok || !data.url) return
    const { fabric } = window as any
    fabric.Image.fromURL(data.url, (img: any) => {
      const scale = Math.min(500 / img.width, 400 / img.height, 1)
      img.scale(scale)
      img.set({ left: 100, top: 100 })
      fabricRef.current.add(img)
      fabricRef.current.setActiveObject(img)
      fabricRef.current.renderAll()
    })
  }

  const isActive = canvasMode !== "hidden"

  const containerClasses = cn(
    "absolute inset-0 transition-all duration-300 z-40",
    canvasMode === "hidden" && "opacity-0 pointer-events-none",
    canvasMode === "overlay" && drawMode ? "pointer-events-auto" : "pointer-events-none",
    canvasMode === "fullscreen" && "fixed inset-0 z-[100] rounded-none overflow-hidden"
  )

  const toolbarClasses = cn(
    "flex items-center gap-2 rounded-2xl border border-black/10 bg-white/95 px-3 py-2 shadow-xl backdrop-blur-lg dark:border-white/20 dark:bg-slate-900/95 mx-auto w-fit pointer-events-auto",
    canvasMode === "overlay" && "fixed top-2 left-1/2 -translate-x-1/2 z-[9999]",
    canvasMode === "fullscreen" && "absolute left-1/2 -translate-x-1/2 top-4 z-[9999]"
  )

  return (
    <>
      <div
        ref={containerRef}
        className={containerClasses}
        style={{
          backgroundColor: canvasMode === "fullscreen"
            ? (dark ? "#1f1f1f" : "#ffffff")
            : "transparent"
        }}
      />
      {canvasMode !== "hidden" && (
        <div className={toolbarClasses}>
            <button
              onClick={cycleMode}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white transition-all hover:bg-sky-600 hover:scale-105"
              title={canvasMode === "overlay" ? "全螢幕" : "返回"}
            >
              {canvasMode === "overlay" ? <Maximize2 className="h-5 w-5" /> : <Minimize2 className="h-5 w-5" />}
            </button>

            <button
              onClick={() => setCanvasMode("hidden")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
              title="隱藏"
            >
              <EyeOff className="h-5 w-5" />
            </button>

            <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

            {TOOLS.map((t) => (
              <button
                key={t.tool}
                onClick={() => setTool(t.tool)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-110",
                  tool === t.tool
                    ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/40"
                    : "text-slate-600 hover:bg-sky-500/10 dark:text-slate-300 dark:hover:bg-sky-400/15"
                )}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}

            <div className="h-8 w-px bg-black/10 dark:bg-white/10" />

            {(tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "text") && (
              <div className="relative">
                <button
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-300 transition-all hover:scale-110"
                  style={{ backgroundColor: penColor }}
                  title="顏色"
                />
                {showColorPicker && (
                  <div className="absolute top-full left-1/2 mt-2 flex -translate-x-1/2 gap-1.5 rounded-xl bg-white p-2 shadow-xl dark:bg-slate-800">
                    {PEN_COLORS.map((c) => (
                      <button
                        key={c.key}
                        onClick={() => { setPenColor(c.color); setShowColorPicker(false) }}
                        className={cn(
                          "h-8 w-8 rounded-full border-2 border-white shadow transition-all hover:scale-110",
                          penColor === c.color ? "ring-2 ring-sky-500 ring-offset-2" : ""
                        )}
                        style={{ backgroundColor: c.color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {tool === "hl" && (
              <div className="flex gap-1.5">
                {HL_COLORS.map((c) => (
                  <button
                    key={c.key}
                    onClick={() => setHlColor(c.rgba)}
                    className={cn(
                      "h-9 w-9 rounded-full border-2 border-white shadow transition-all hover:scale-110",
                      hlColor === c.rgba ? "ring-2 ring-sky-500 ring-offset-2" : ""
                    )}
                    style={{ backgroundColor: c.rgba }}
                  />
                ))}
              </div>
            )}

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
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              title="插入圖片"
            >
              <ImagePlus className="h-5 w-5" />
            </button>

            <button
              onClick={() => (ref as any).current?.clear()}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="清空"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
      )}

        {isActive && <canvas ref={canvasElRef} className="absolute inset-0 w-full h-full pointer-events-auto" />}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) uploadImage(f)
          e.target.value = ""
        }}
      />
    </>
  )
})
