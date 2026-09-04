"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import {
  MousePointer2, Pencil, Highlighter, Eraser, Square, Circle, Type, ImagePlus, Undo2, Trash2, Hand
} from "lucide-react"
import { cn } from "@/lib/utils"

export type CanvasTool = "none" | "move" | "pen" | "hl" | "eraser" | "rect" | "ellipse" | "text"

export interface CanvasApi {
  toJSON: () => string | null
  load: (json: unknown) => void
  toDataURL: () => string | null
  isEmpty: () => boolean
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
  { key: "purple", label: "紫", rgba: "rgba(168,85,247,0.35)" },
  { key: "red", label: "紅", rgba: "rgba(239,68,68,0.35)" },
  { key: "blue", label: "藍", rgba: "rgba(59,130,246,0.35)" }
]

const TOOLS: { tool: CanvasTool; icon: React.ReactNode; label: string }[] = [
  { tool: "none", icon: <MousePointer2 className="h-5 w-5" />, label: "閱讀模式（畫筆關閉）" },
  { tool: "move", icon: <Hand className="h-5 w-5" />, label: "移動圖層" },
  { tool: "pen", icon: <Pencil className="h-5 w-5" />, label: "畫筆" },
  { tool: "hl", icon: <Highlighter className="h-5 w-5" />, label: "螢光筆" },
  { tool: "eraser", icon: <Eraser className="h-5 w-5" />, label: "橡皮擦" },
  { tool: "rect", icon: <Square className="h-5 w-5" />, label: "矩形" },
  { tool: "ellipse", icon: <Circle className="h-5 w-5" />, label: "圓形" },
  { tool: "text", icon: <Type className="h-5 w-5" />, label: "文字（雙擊畫布）" }
]

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, dark, onDirty, followsText = false, scrollContainerRef = null, forceActive = false, canvasTopOffset = 0 }, ref) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const historyRef = useRef<string[]>([])
  const loadingRef = useRef(false)
  const shapeRef = useRef<any>(null)
  const origRef = useRef<{ x: number; y: number } | null>(null)
  const resizeRef = useRef<(() => void) | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  const [tool, setTool] = useState<CanvasTool>("none")
  const [hlColor, setHlColor] = useState(HL_COLORS[0].rgba)
  const [ready, setReady] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (forceActive && tool === "none") setTool("pen")
    if (!forceActive && tool !== "none" && tool !== "move") setTool("none")
  }, [forceActive, tool])

  const active = tool !== "none" || forceActive

  useImperativeHandle(ref, (): CanvasApi => ({
    toJSON: () => {
      try {
        return JSON.stringify(fabricRef.current?.toJSON() ?? null)
      } catch {
        return null
      }
    },
    load: (json) => {
      if (!fabricRef.current || !json) return
      loadingRef.current = true
      fabricRef.current.loadFromJSON(json, () => {
        applyTool(fabricRef.current, toolRef.current, hlColor, dark)
        fabricRef.current.renderAll()
        loadingRef.current = false
      })
    },
    toDataURL: () => {
      try {
        return fabricRef.current?.toDataURL({ format: "png", multiplier: 2 }) ?? null
      } catch {
        return null
      }
    },
    isEmpty: () => (fabricRef.current?.getObjects().length ?? 0) === 0,
    addSticker: (text: string, color = "#a78bfa") => {
      if (!fabricRef.current) return
      const c = fabricRef.current
      const f = (window as any).fabric
      if (!f) return
      const padding = 10
      const fontSize = 20
      const temp = c.getObjects().length
      const x = 80 + (temp % 6) * 30
      const y = 80 + (temp % 6) * 30
      const grp = new f.Group(
        [
          new f.Rect({
            left: 0, top: 0, width: 100, height: 40, rx: 12, ry: 12,
            fill: color, stroke: "rgba(255,255,255,0.5)", strokeWidth: 1.5, originX: "left", originY: "top"
          }),
          new f.IText(text, {
            left: 50, top: 20, originX: "center", originY: "center",
            fontSize, fontFamily: "ui-sans-serif, system-ui, sans-serif",
            fontWeight: 700, fill: "#ffffff", editable: true
          })
        ],
        { left: x, top: y, originX: "left", originY: "top" }
      )
      ;(grp as any).__sticker = true
      c.add(grp)
      c.setActiveObject(grp)
      c.requestRenderAll()
    }
  }))

  const toolRef = useRef(tool)
  toolRef.current = tool

  function applyTool(c: any, t: CanvasTool, color: string, dk: boolean) {
    c.selection = t === "move"
    c.isDrawingMode = t === "pen" || t === "hl"
    c.defaultCursor = t === "move" ? "default" : "crosshair"
    const objsSelectable = t === "move" || t === "text"
    const objsEvented = t === "move" || t === "text" || t === "eraser"
    c.forEachObject((o: any) => {
      o.selectable = objsSelectable
      o.evented = objsEvented
    })
    if (c.isDrawingMode) {
      const brush = new (window as any).fabric.PencilBrush(c)
      brush.color = t === "pen" ? (dk ? "#f8fafc" : "#111827") : color
      brush.width = t === "pen" ? 3.5 : 26
      c.freeDrawingBrush = brush
    }
    if (t !== "move") c.discardActiveObject()
    c.requestRenderAll()
  }

  useEffect(() => {
    if (tool === "none") {
      if (roRef.current) {
        roRef.current.disconnect()
        roRef.current = null
      }
      fabricRef.current?.dispose()
      fabricRef.current = null
      setReady(false)
      return
    }
    if (fabricRef.current) {
      setReady(true)
      return
    }
    let disposed = false
    ;(async () => {
      const mod = await import("fabric")
      const fabric: any = (mod as any).fabric ?? (mod as any).default ?? mod
      if (disposed || !canvasElRef.current) return
      ;(window as any).fabric = fabric
      const c = new fabric.Canvas(canvasElRef.current, {
        isDrawingMode: false,
        selection: true,
        preserveObjectStacking: true
      })
      fabricRef.current = c

      const resize = () => {
        if (!wrapRef.current || !c) return
        c.setWidth(wrapRef.current.clientWidth)
        c.setHeight(wrapRef.current.clientHeight)
        c.calcOffset()
        c.renderAll()
      }
      resizeRef.current = resize

      window.addEventListener("resize", resize)
      const ro = new ResizeObserver(resize)
      ro.observe(wrapRef.current!)
      roRef.current = ro
      setReady(true)

      const pushHistory = () => {
        if (loadingRef.current) return
        historyRef.current.push(JSON.stringify(c.toJSON()))
        if (historyRef.current.length > 40) historyRef.current.shift()
        onDirty?.()
      }
      c.on("object:added", pushHistory)
      c.on("object:removed", pushHistory)
      c.on("object:modified", pushHistory)

      c.on("mouse:down", (evt: any) => {
        const t = toolRef.current
        if (t === "eraser") {
          const target = c.findTarget(evt.e)
          if (target) c.remove(target)
          return
        }
        if (t === "rect" || t === "ellipse") {
          const pointer = c.getPointer(evt.e)
          origRef.current = pointer
          const common = {
            left: pointer.x,
            top: pointer.y,
            width: 1,
            height: 1,
            fill: "transparent",
            stroke: dark ? "#f8fafc" : "#111827",
            strokeWidth: 4
          }
          shapeRef.current = t === "rect" ? new (fabric as any).Rect(common) : new (fabric as any).Ellipse({ ...common, rx: 1, ry: 1 })
          c.add(shapeRef.current)
        }
      })
      c.on("mouse:move", (evt: any) => {
        if (!shapeRef.current || !origRef.current) return
        const p = c.getPointer(evt.e)
        const o = origRef.current
        if (toolRef.current === "rect") {
          shapeRef.current.set({ left: Math.min(o.x, p.x), top: Math.min(o.y, p.y), width: Math.abs(p.x - o.x), height: Math.abs(p.y - o.y) })
        } else {
          const rx = Math.abs(p.x - o.x) / 2
          const ry = Math.abs(p.y - o.y) / 2
          shapeRef.current.set({ left: Math.min(o.x, p.x), top: Math.min(o.y, p.y), rx, ry })
        }
        c.requestRenderAll()
      })
      c.on("mouse:up", () => {
        if (shapeRef.current) {
          shapeRef.current.setCoords()
          shapeRef.current.selectable = false
          shapeRef.current.evented = false
          shapeRef.current = null
          origRef.current = null
        }
      })

      c.on("mouse:dblclick", (evt: any) => {
        if (toolRef.current !== "text") return
        const p = c.getPointer(evt.e)
        const t = new (fabric as any).IText("", {
          left: p.x,
          top: p.y,
          fontSize: 36,
          fill: dark ? "#f8fafc" : "#111827",
          fontFamily: '"Noto Sans TC","Microsoft JhengHei",sans-serif'
        })
        c.add(t)
        c.setActiveObject(t)
        t.enterEditing()
      })
    })()

    return () => {
      disposed = true
      if (resizeRef.current) window.removeEventListener("resize", resizeRef.current)
      if (roRef.current) {
        roRef.current.disconnect()
        roRef.current = null
      }
      fabricRef.current?.dispose()
      fabricRef.current = null
      resizeRef.current = null
    }
  }, [tool])

  useEffect(() => {
    if (fabricRef.current && ready) applyTool(fabricRef.current, tool, hlColor, dark)
  }, [tool, hlColor, dark, ready])

  useEffect(() => {
    if (!followsText || !scrollContainerRef?.current || !wrapRef.current) return
    const scroller = scrollContainerRef.current
    const wrap = wrapRef.current
    function update() {
      wrap.style.transform = `translateY(${scroller.scrollTop}px)`
    }
    update()
    scroller.addEventListener("scroll", update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(scroller)
    return () => {
      scroller.removeEventListener("scroll", update)
      ro.disconnect()
    }
  }, [followsText, scrollContainerRef, articleId])

  useEffect(() => {
    if (!followsText || !wrapRef.current) return
    const wrap = wrapRef.current
    function update() {
      const y = window.scrollY
      wrap.style.transform = `translateY(${y}px)`
    }
    update()
    window.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [followsText, articleId])

  async function uploadImage(file: File) {
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const data = await res.json()
    if (!res.ok || !data.url) return
    const mod = await import("fabric")
    const fabric: any = (mod as any).fabric ?? (mod as any).default ?? mod
    const c = fabricRef.current
    if (!c) return
    ;(fabric as any).Image.fromURL(data.url, (img: any) => {
      const scale = Math.min(360 / img.width, 280 / img.height, 1.5)
      img.scale(scale)
      img.set({ left: 60, top: 60 })
      c.add(img)
      c.setActiveObject(img)
      applyTool(c, toolRef.current, hlColor, dark)
    })
  }

  function undo() {
    const c = fabricRef.current
    if (!c) return
    const prev = historyRef.current.pop()
    if (!prev) return
    loadingRef.current = true
    c.loadFromJSON(prev, () => {
      applyTool(c, toolRef.current, hlColor, dark)
      c.renderAll()
      loadingRef.current = false
    })
  }

  return (
    <div
      className="absolute inset-0"
      style={{ pointerEvents: "none" }}
      data-article={articleId}
    >
      <div
        ref={wrapRef}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-3xl",
          active ? "pointer-events-auto" : "opacity-0"
        )}
        style={{ zIndex: active ? 30 : 0 }}
        aria-hidden={!active}
      >
        <canvas ref={canvasElRef} />
      </div>

      <div className="pointer-events-auto absolute left-3 top-3 z-20 flex max-w-[92%] flex-wrap items-center gap-1.5 rounded-2xl border border-white/60 bg-white/85 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/85">
        {TOOLS.map((t) => (
          <button
            key={t.tool}
            title={t.label}
            onClick={() => setTool(t.tool)}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-105",
              tool === t.tool
                ? "bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/40"
                : "text-slate-600 hover:bg-sky-500/10 dark:text-slate-300 dark:hover:bg-sky-400/15"
            )}
          >
            {t.icon}
          </button>
        ))}
        {tool === "hl" && (
          <span className="ml-1 flex items-center gap-1">
            {HL_COLORS.map((c) => (
              <button
                key={c.key}
                onClick={() => setHlColor(c.rgba)}
                title={`螢光 ${c.label}`}
                className={cn(
                  "h-7 w-7 rounded-full border-2",
                  hlColor === c.rgba ? "border-white ring-2 ring-sky-500" : "border-transparent"
                )}
                style={{ backgroundColor: c.rgba }}
              />
            ))}
          </span>
        )}
        <span className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-700" />
        <button
          title="插入圖片"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <ImagePlus className="h-5 w-5" />
        </button>
        <button
          title="復原"
          onClick={undo}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        <button
          title="清空畫布"
          onClick={() => fabricRef.current?.getObjects().slice().forEach((o: any) => fabricRef.current.remove(o))}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
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
