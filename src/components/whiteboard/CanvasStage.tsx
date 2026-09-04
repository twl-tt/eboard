"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react"
import {
  MousePointer2, Pencil, Highlighter, Eraser, Square, Circle, Type, ImagePlus, Undo2, Redo2, Trash2, Hand
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CanvasTool = "select" | "pen" | "hl" | "eraser" | "rect" | "ellipse" | "text" | "pan"

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
}

const HL_COLORS = [
  { key: "purple", rgba: "rgba(168,85,247,0.6)" },
  { key: "red", rgba: "rgba(239,68,68,0.6)" },
  { key: "blue", rgba: "rgba(59,130,246,0.6)" }
]

const PEN_COLORS = [
  { key: "black", color: "#111827" },
  { key: "white", color: "#f8fafc" },
  { key: "red", color: "#ef4444" },
  { key: "blue", color: "#3b82f6" },
  { key: "green", color: "#22c55e" },
  { key: "yellow", color: "#eab308" }
]

const TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { tool: "select", icon: <MousePointer2 className="h-5 w-5" />, label: "選擇" },
  { tool: "pan", icon: <Hand className="h-5 w-5" />, label: "拖曳" },
  { tool: "pen", icon: <Pencil className="h-5 w-5" />, label: "畫筆" },
  { tool: "hl", icon: <Highlighter className="h-5 w-5" />, label: "螢光筆" },
  { tool: "eraser", icon: <Eraser className="h-5 w-5" />, label: "橡皮擦" },
  { tool: "rect", icon: <Square className="h-5 w-5" />, label: "矩形" },
  { tool: "ellipse", icon: <Circle className="h-5 w-5" />, label: "橢圓" },
  { tool: "text", icon: <Type className="h-5 w-5" />, label: "文字" }
]

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark, onDirty, followsText = false, scrollContainerRef = null, forceActive = false, canvasTopOffset = 0 }, ref) {
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const isLoadingRef = useRef(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const fabricLibRef = useRef<any>(null)

  const [active, setActive] = useState(false)
  const [tool, setTool] = useState<CanvasTool>("select")
  const [penColor, setPenColor] = useState(PEN_COLORS[0].color)
  const [hlColor, setHlColor] = useState(HL_COLORS[0].rgba)
  const [initialized, setInitialized] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showHlColors, setShowHlColors] = useState(false)

  const initCanvas = useCallback(async () => {
    if (fabricRef.current) return
    if (!canvasElRef.current) return

    const mod = await import("fabric")
    const fabric: any = (mod as any).fabric ?? (mod as any).default ?? mod
    ;(window as any).fabric = fabric
    fabricLibRef.current = fabric
    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: canvasWrapRef.current?.clientWidth || 800,
      height: canvasWrapRef.current?.clientHeight || 600,
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

    setInitialized(true)
  }, [onDirty])

  useEffect(() => {
    if (active && !fabricRef.current) {
      initCanvas()
    }
  }, [active, initCanvas])

  useEffect(() => {
    if (!initialized || !fabricRef.current) return
    const canvas = fabricRef.current

    canvas.isDrawingMode = false
    canvas.selection = tool === "select"
    canvas.defaultCursor = tool === "pan" ? "grab" : "crosshair"

    canvas.forEachObject((obj: any) => {
      obj.selectable = tool === "select" || tool === "pan"
      obj.evented = tool === "select" || tool === "pan" || tool === "eraser"
    })

    if (tool === "pen") {
      canvas.isDrawingMode = true
      canvas.selection = false
      const brush = new fabricLibRef.current.PencilBrush(canvas)
      brush.color = penColor
      brush.width = 4
      canvas.freeDrawingBrush = brush
    }

    if (tool === "hl") {
      canvas.isDrawingMode = true
      canvas.selection = false
      const brush = new fabricLibRef.current.PencilBrush(canvas)
      brush.color = hlColor
      brush.width = 28
      brush.shadow = new fabricLibRef.current.Shadow({
        color: hlColor,
        blur: 15,
        offsetX: 0,
        offsetY: 0
      })
      canvas.freeDrawingBrush = brush
    }

    if (tool === "eraser") {
      canvas.defaultCursor = "cell"
    }

    canvas.renderAll()
  }, [tool, penColor, hlColor, initialized])

  useEffect(() => {
    if (!initialized) return
    const canvas = fabricRef.current
    if (!canvas) return

    const handleMouseDown = (e: any) => {
      if (tool !== "rect" && tool !== "ellipse") return
      const pointer = canvas.getPointer(e.e)
      const common = {
        left: pointer.x,
        top: pointer.y,
        width: 1,
        height: 1,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: 3
      }
      const shape = tool === "rect"
        ? new fabricLibRef.current.Rect(common)
        : new fabricLibRef.current.Ellipse({ ...common, rx: 1, ry: 1 })
      ;(shape as any)._isDrawingShape = true
      canvas.add(shape)
    }

    const handleMouseMove = (e: any) => {
      if (tool !== "rect" && tool !== "ellipse") return
      const activeShape = canvas.getObjects().find((o: any) => o._isDrawingShape)
      if (!activeShape) return
      const pointer = canvas.getPointer(e.e)
      const left = Math.min(activeShape.left!, pointer.x)
      const top = Math.min(activeShape.top!, pointer.y)
      const width = Math.abs(pointer.x - activeShape.left!)
      const height = Math.abs(pointer.y - activeShape.top!)

      if (tool === "rect") {
        activeShape.set({ left, top, width, height })
      } else {
        activeShape.set({ left, top, rx: width / 2, ry: height / 2 })
      }
      canvas.renderAll()
    }

    const handleMouseUp = (e: any) => {
      if (tool !== "rect" && tool !== "ellipse") return
      const activeShape = canvas.getObjects().find((o: any) => o._isDrawingShape)
      if (!activeShape) return
      ;(activeShape as any)._isDrawingShape = false
      activeShape.setCoords()
    }

    const handleDblClick = (e: any) => {
      if (tool !== "text") return
      const pointer = canvas.getPointer(e.e)
      const text = new fabricLibRef.current.IText("", {
        left: pointer.x,
        top: pointer.y,
        fontSize: 24,
        fill: penColor,
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
  }, [tool, penColor, initialized])

  useEffect(() => {
    if (!initialized) return
    const canvas = fabricRef.current
    if (!canvas) return

    const handleEraser = (e: any) => {
      if (tool !== "eraser") return
      const target = canvas.findTarget(e.e)
      if (target) canvas.remove(target)
    }

    canvas.on("mouse:down", handleEraser)
    return () => canvas.off("mouse:down", handleEraser)
  }, [tool, initialized])

  const handleResize = useCallback(() => {
    if (!fabricRef.current || !canvasWrapRef.current) return
    fabricRef.current.setDimensions({
      width: canvasWrapRef.current.clientWidth,
      height: canvasWrapRef.current.clientHeight
    })
    fabricRef.current.renderAll()
  }, [])

  useEffect(() => {
    if (!initialized) return
    window.addEventListener("resize", handleResize)
    const ro = new ResizeObserver(handleResize)
    if (canvasWrapRef.current) ro.observe(canvasWrapRef.current)
    return () => {
      window.removeEventListener("resize", handleResize)
      ro.disconnect()
    }
  }, [initialized, handleResize])

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
      fabricRef.current.getObjects().forEach((o: any) => fabricRef.current.remove(o))
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
      if (!fabricRef.current) return
      const { fabric } = window as any
      if (!fabric) return
      const count = fabricRef.current.getObjects().length
      const x = 60 + (count % 8) * 40
      const y = 60 + (count % 8) * 40
      const bg = new fabric.Rect({
        left: 0, top: 0, width: 120, height: 44, rx: 12, ry: 12,
        fill: color, stroke: "rgba(255,255,255,0.5)", strokeWidth: 2
      })
      const label = new fabric.Text(text, {
        left: 60, top: 22, originX: "center", originY: "center",
        fontSize: 16, fontFamily: "system-ui, sans-serif", fontWeight: "bold",
        fill: "#ffffff"
      })
      const group = new fabric.Group([bg, label], {
        left: x, top: y,
        selectable: true, evented: true
      })
      ;(group as any)._isSticker = true
      fabricRef.current.add(group)
      fabricRef.current.setActiveObject(group)
      fabricRef.current.renderAll()
    }
  }), [])

  const toggleCanvas = () => {
    setActive(prev => !prev)
    setTool("select")
  }

  const uploadImage = async (file: File) => {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok || !data.url || !fabricRef.current) return
    const { fabric } = await import("fabric")
    fabric.Image.fromURL(data.url, (img: any) => {
      const scale = Math.min(400 / img.width, 300 / img.height, 1)
      img.scale(scale)
      img.set({ left: 50, top: 50 })
      fabricRef.current.add(img)
      fabricRef.current.setActiveObject(img)
      fabricRef.current.renderAll()
    })
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      <div
        ref={canvasWrapRef}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-3xl transition-opacity duration-200",
          active ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        style={{ zIndex: 30, background: dark ? "#1a1a1a" : "#ffffff" }}
      >
        <canvas ref={canvasElRef} />
      </div>

      <div className="pointer-events-auto fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-black/10 bg-white/90 px-3 py-2 shadow-xl backdrop-blur-lg dark:border-white/20 dark:bg-black/80">
        <button
          onClick={toggleCanvas}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
            active ? "bg-red-500 text-white hover:bg-red-600" : "bg-sky-500 text-white hover:bg-sky-600"
          )}
          title={active ? "關閉畫板" : "開啟畫板"}
        >
          {active ? <Trash2 className="h-5 w-5" /> : <Pencil className="h-5 w-5" />}
        </button>

        {active && (
          <>
            <div className="mx-1 h-8 w-px bg-black/10 dark:bg-white/10" />

            {TOOLS.map((t) => (
              <button
                key={t.tool}
                onClick={() => setTool(t.tool)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-105",
                  tool === t.tool
                    ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/40"
                    : "text-slate-600 hover:bg-sky-500/10 dark:text-slate-300 dark:hover:bg-sky-400/15"
                )}
                title={t.label}
              >
                {t.icon}
              </button>
            ))}

            {(tool === "pen" || tool === "rect" || tool === "ellipse" || tool === "text") && (
              <>
                <div className="mx-1 h-8 w-px bg-black/10 dark:bg-white/10" />
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowColorPicker(!showColorPicker)
                      setShowHlColors(false)
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-transparent hover:border-sky-500"
                    style={{ backgroundColor: penColor }}
                    title="顏色"
                  />
                  {showColorPicker && (
                    <div className="absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 gap-1 rounded-xl bg-white p-2 shadow-xl dark:bg-slate-800">
                      {PEN_COLORS.map((c) => (
                        <button
                          key={c.key}
                          onClick={() => { setPenColor(c.color); setShowColorPicker(false) }}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 border-white shadow",
                            penColor === c.color ? "ring-2 ring-sky-500 ring-offset-2" : ""
                          )}
                          style={{ backgroundColor: c.color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {tool === "hl" && (
              <>
                <div className="mx-1 h-8 w-px bg-black/10 dark:bg-white/10" />
                <div className="relative flex gap-1">
                  {HL_COLORS.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setHlColor(c.rgba)}
                      className={cn(
                        "h-8 w-8 rounded-full border-2 border-white shadow",
                        hlColor === c.rgba ? "ring-2 ring-sky-500 ring-offset-2" : ""
                      )}
                      style={{ backgroundColor: c.rgba }}
                    />
                  ))}
                </div>
              </>
            )}

            <div className="mx-1 h-8 w-px bg-black/10 dark:bg-white/10" />

            <button
              onClick={() => { (ref as any).current?.undo() }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              title="復原"
            >
              <Undo2 className="h-5 w-5" />
            </button>

            <button
              onClick={() => { (ref as any).current?.redo() }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              title="重做"
            >
              <Redo2 className="h-5 w-5" />
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
              title="插入圖片"
            >
              <ImagePlus className="h-5 w-5" />
            </button>

            <button
              onClick={() => { (ref as any).current?.clear() }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="清空"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

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
    </div>
  )
})
