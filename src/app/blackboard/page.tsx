"use client"

import { useState, useRef, useEffect, Suspense } from "react"
import { X, Pencil, Eraser, Square, Circle, Trash2, Minus, Highlighter, Type, Move, Undo2, Redo2, ArrowLeft } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

type CanvasTool = "select" | "pen" | "eraser" | "rect" | "ellipse" | "line" | "highlighter" | "text"

const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#eab308"]
const HIGHLIGHTER_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe"]

function BlackboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const articleId = searchParams.get("article")

  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const fabricModuleRef = useRef<any>(null)
  const [tool, setTool] = useState<CanvasTool>("pen")
  const [color, setColor] = useState("#dc2626")
  const [boardColor, setBoardColor] = useState("#1f2937")
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const toolRef = useRef<CanvasTool>("pen")
  const colorRef = useRef("#dc2626")
  const [touchOffsetX, setTouchOffsetX] = useState(0)
  const [touchOffsetY, setTouchOffsetY] = useState(0)

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => {
    const savedX = parseInt(localStorage.getItem("touchOffsetX") || "0")
    const savedY = parseInt(localStorage.getItem("touchOffsetY") || "0")
    setTouchOffsetX(savedX)
    setTouchOffsetY(savedY)
  }, [])

  const [toolbarPos, setToolbarPos] = useState({ x: window.innerWidth - 64, y: 20 })
  const toolbarDragRef = useRef<{ startX: number; startY: number } | null>(null)

  useEffect(() => {
    if (!canvasElRef.current) return

    let canvas: any
    let isDrawing = false
    let startPoint: any = null
    let currentShape: any = null

    const init = async () => {
      const { fabric } = await import("fabric")
      fabricModuleRef.current = fabric

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: boardColor,
        selection: true
      })
      fabricRef.current = canvas

      // Apply touch offset to adjust touch coordinates
      if (touchOffsetX !== 0 || touchOffsetY !== 0) {
        const originalGetPointer = canvas.getPointer.bind(canvas)
        canvas.getPointer = (e: any, ignoreZoom = false) => {
          const pointer = originalGetPointer(e, ignoreZoom)
          return {
            x: pointer.x - touchOffsetX,
            y: pointer.y - touchOffsetY
          }
        }
      }

      const saveHistory = () => {
        const json = JSON.stringify(canvas.toJSON())
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1)
        historyRef.current.push(json)
        if (historyRef.current.length > 30) historyRef.current.shift()
        historyIndexRef.current = historyRef.current.length - 1
      }

      const setToolMode = (t: CanvasTool) => {
        canvas.isDrawingMode = false
        canvas.selection = false
        canvas.forEachObject((obj: any) => { obj.selectable = false; obj.evented = false })

        switch (t) {
          case "select":
            canvas.selection = true
            canvas.forEachObject((obj: any) => { obj.selectable = true; obj.evented = true })
            break
          case "pen":
            canvas.isDrawingMode = true
            canvas.freeDrawingBrush.color = colorRef.current
            canvas.freeDrawingBrush.width = 3
            break
          case "eraser":
            canvas.isDrawingMode = true
            canvas.freeDrawingBrush.color = boardColor
            canvas.freeDrawingBrush.width = 20
            break
          case "highlighter":
            canvas.isDrawingMode = true
            canvas.freeDrawingBrush.color = colorRef.current + "80"
            canvas.freeDrawingBrush.width = 25
            break
        }
      }

      canvas.on("mouse:down", (options: any) => {
        if (toolRef.current === "select") return
        if (toolRef.current === "text") {
          const pointer = canvas.getPointer(options.e)
          const text = new fabric.IText("", {
            left: pointer.x,
            top: pointer.y,
            fontFamily: "sans-serif",
            fontSize: 24,
            fill: colorRef.current
          })
          canvas.add(text)
          canvas.setActiveObject(text)
          text.enterEditing()
          setTool("select")
          saveHistory()
          return
        }
        if (toolRef.current === "rect" || toolRef.current === "ellipse" || toolRef.current === "line") {
          isDrawing = true
          startPoint = canvas.getPointer(options.e)
          if (toolRef.current === "rect") {
            currentShape = new fabric.Rect({
              left: startPoint.x,
              top: startPoint.y,
              width: 0,
              height: 0,
              fill: "transparent",
              stroke: colorRef.current,
              strokeWidth: 3
            })
          } else if (toolRef.current === "ellipse") {
            currentShape = new fabric.Ellipse({
              left: startPoint.x,
              top: startPoint.y,
              rx: 0,
              ry: 0,
              fill: "transparent",
              stroke: colorRef.current,
              strokeWidth: 3
            })
          } else if (toolRef.current === "line") {
            currentShape = new fabric.Line([startPoint.x, startPoint.y, startPoint.x, startPoint.y], {
              stroke: colorRef.current,
              strokeWidth: 3
            })
          }
          canvas.add(currentShape)
        }
      })

      canvas.on("mouse:move", (options: any) => {
        if (!isDrawing || !currentShape) return
        const pointer = canvas.getPointer(options.e)
        if (toolRef.current === "rect") {
          currentShape.set({
            width: Math.abs(pointer.x - startPoint.x),
            height: Math.abs(pointer.y - startPoint.y),
            left: Math.min(startPoint.x, pointer.x),
            top: Math.min(startPoint.y, pointer.y)
          })
        } else if (toolRef.current === "ellipse") {
          currentShape.set({
            rx: Math.abs(pointer.x - startPoint.x) / 2,
            ry: Math.abs(pointer.y - startPoint.y) / 2,
            left: Math.min(startPoint.x, pointer.x),
            top: Math.min(startPoint.y, pointer.y)
          })
        } else if (toolRef.current === "line") {
          currentShape.set({ x2: pointer.x, y2: pointer.y })
        }
        canvas.renderAll()
      })

      canvas.on("mouse:up", () => {
        if (isDrawing) {
          isDrawing = false
          currentShape = null
          saveHistory()
        }
      })

      canvas.on("path:created", () => saveHistory())
      canvas.on("object:modified", () => saveHistory())
      canvas.on("text:changed", () => saveHistory())

      canvas.setToolMode = setToolMode
      setToolMode("pen")
      saveHistory()
    }

    init()

    const handleResize = () => {
      if (!fabricRef.current) return
      fabricRef.current.setWidth(window.innerWidth)
      fabricRef.current.setHeight(window.innerHeight)
      fabricRef.current.renderAll()
    }

    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    }
  }, [boardColor])

  useEffect(() => {
    if (!fabricRef.current) return
    fabricRef.current.setToolMode(tool)
  }, [tool])

  useEffect(() => {
    if (!fabricRef.current) return
    if (fabricRef.current.freeDrawingBrush) {
      fabricRef.current.freeDrawingBrush.color = tool === "eraser" ? boardColor : tool === "highlighter" ? color + "80" : color
    }
  }, [color, tool, boardColor])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!toolbarDragRef.current) return
      setToolbarPos({ x: e.clientX - toolbarDragRef.current.startX, y: e.clientY - toolbarDragRef.current.startY })
    }
    const handleMouseUp = () => { toolbarDragRef.current = null }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current
    const originalGetPointer = canvas.__originalGetPointer || canvas.getPointer.bind(canvas)
    canvas.__originalGetPointer = originalGetPointer
    canvas.getPointer = (e: any, ignoreZoom = false) => {
      const pointer = originalGetPointer(e, ignoreZoom)
      return {
        x: pointer.x - touchOffsetX,
        y: pointer.y - touchOffsetY
      }
    }
  }, [touchOffsetX, touchOffsetY])

  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    toolbarDragRef.current = { startX: e.clientX - toolbarPos.x, startY: e.clientY - toolbarPos.y }
  }

  const handleToolbarTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return
    e.preventDefault()
    const t = e.touches[0]
    toolbarDragRef.current = { startX: t.clientX - toolbarPos.x, startY: t.clientY - toolbarPos.y }
  }

  const handleToolbarTouchMove = (e: React.TouchEvent) => {
    if (!toolbarDragRef.current) return
    e.preventDefault()
    const t = e.touches[0]
    setToolbarPos({ x: t.clientX - toolbarDragRef.current.startX, y: t.clientY - toolbarDragRef.current.startY })
  }

  const handleToolbarTouchEnd = () => {
    toolbarDragRef.current = null
  }

  const handleToolChange = (newTool: CanvasTool) => {
    setTool(newTool)
  }

  const undo = () => {
    if (historyIndexRef.current <= 0 || !fabricRef.current) return
    historyIndexRef.current--
    const json = historyRef.current[historyIndexRef.current]
    if (json) {
      fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
        fabricRef.current.renderAll()
      })
    }
  }

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return
    historyIndexRef.current++
    const json = historyRef.current[historyIndexRef.current]
    if (json) {
      fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
        fabricRef.current.renderAll()
      })
    }
  }

  const clear = () => {
    if (!fabricRef.current) return
    fabricRef.current.clear()
    fabricRef.current.setBackgroundColor(boardColor, fabricRef.current.renderAll.bind(fabricRef.current))
  }

  const saveTouchOffset = () => {
    localStorage.setItem("touchOffsetX", String(touchOffsetX))
    localStorage.setItem("touchOffsetY", String(touchOffsetY))
  }

  return (
    <div className="fixed inset-0 bg-slate-900" style={{ backgroundColor: boardColor }}>
      <canvas ref={canvasElRef} className="absolute inset-0" style={{ touchAction: "pan-y" }} />

      <div
        className="fixed z-50 flex flex-col items-center gap-1 rounded-xl border border-slate-700/50 bg-slate-900/95 px-1.5 py-2 shadow-lg cursor-move select-none"
        style={{ left: toolbarPos.x, top: toolbarPos.y }}
        onMouseDown={handleToolbarMouseDown}
        onTouchStart={handleToolbarTouchStart}
        onTouchMove={handleToolbarTouchMove}
        onTouchEnd={handleToolbarTouchEnd}
      >
        <button onClick={() => router.push(articleId ? `/whiteboard?article=${articleId}` : "/whiteboard")} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white" title="返回">
          <ArrowLeft className="h-3.5 w-3.5" />
        </button>

        <div className="w-full h-px bg-slate-700 my-0.5" />

        <button onClick={() => setTool("select")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "select" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="選擇">
          <Move className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleToolChange("pen")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "pen" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="畫筆">
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleToolChange("eraser")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "eraser" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="橡皮擦">
          <Eraser className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleToolChange("rect")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "rect" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="矩形">
          <Square className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleToolChange("ellipse")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "ellipse" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="橢圓">
          <Circle className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleToolChange("line")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "line" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="直線">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => { handleToolChange("highlighter"); if (!HIGHLIGHTER_COLORS.includes(color)) setColor("#fef08a") }} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "highlighter" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="螢光筆">
          <Highlighter className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => handleToolChange("text")} className={`flex h-8 w-8 items-center justify-center rounded-lg ${tool === "text" ? "bg-sky-500 text-white" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`} title="文字">
          <Type className="h-3.5 w-3.5" />
        </button>

        <div className="w-full h-px bg-slate-700 my-0.5" />

        <div className="flex flex-col gap-1 items-center">
          {(tool === "highlighter" ? HIGHLIGHTER_COLORS : COLORS).map(c => (
            <button key={c} onClick={() => setColor(c)} className={`h-6 w-6 rounded-full border-2 ${color === c ? "border-sky-500 scale-110" : "border-slate-700"} hover:scale-110 transition-all`} style={{ backgroundColor: c }} />
          ))}
        </div>

        <div className="w-full h-px bg-slate-700 my-0.5" />

        <button onClick={undo} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white" title="復原">
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={redo} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white" title="重做">
          <Redo2 className="h-3.5 w-3.5" />
        </button>
        <button onClick={clear} className="flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-900/30" title="清除">
          <Trash2 className="h-3.5 w-3.5" />
        </button>

        <div className="w-full h-px bg-slate-700 my-0.5" />

        <div className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
          <span>觸控校準</span>
          <div className="flex items-center gap-1">
            <span>X</span>
            <input
              type="number"
              value={touchOffsetX}
              onChange={(e) => setTouchOffsetX(parseInt(e.target.value) || 0)}
              className="h-6 w-12 rounded bg-slate-800 px-1 text-center text-xs text-white focus:outline-none"
            />
            <span>Y</span>
            <input
              type="number"
              value={touchOffsetY}
              onChange={(e) => setTouchOffsetY(parseInt(e.target.value) || 0)}
              className="h-6 w-12 rounded bg-slate-800 px-1 text-center text-xs text-white focus:outline-none"
            />
            <button
              onClick={saveTouchOffset}
              className="h-6 rounded bg-sky-600 px-2 text-xs text-white hover:bg-sky-500"
            >
              儲存
            </button>
          </div>
        </div>

        <div className="w-full h-px bg-slate-700 my-0.5" />

        <input
          type="color"
          value={boardColor}
          onChange={(e) => {
            setBoardColor(e.target.value)
            if (fabricRef.current) {
              fabricRef.current.setBackgroundColor(e.target.value, fabricRef.current.renderAll.bind(fabricRef.current))
            }
          }}
          className="h-6 w-6 cursor-pointer rounded border border-slate-700"
          title="黑板顏色"
        />
      </div>
    </div>
  )
}

export default function BlackboardPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-slate-900 flex items-center justify-center"><span className="text-white">載入中...</span></div>}>
      <BlackboardContent />
    </Suspense>
  )
}
