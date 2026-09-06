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

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])

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
            canvas.freeDrawingBrush.color = colorRef.current + "33"
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
      fabricRef.current.freeDrawingBrush.color = tool === "eraser" ? boardColor : color
    }
  }, [color, tool, boardColor])

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

  return (
    <div className="fixed inset-0 bg-slate-900" style={{ backgroundColor: boardColor }}>
      <canvas ref={canvasElRef} className="absolute inset-0" />

      <div className="absolute top-0 left-2 flex items-center gap-0.5 rounded-lg border border-slate-700/50 bg-slate-900/90 px-2 py-1 shadow-md z-50">
        <button onClick={() => router.push(articleId ? `/whiteboard?article=${articleId}` : "/whiteboard")} className="p-1 rounded hover:bg-slate-700 text-white" title="返回">
          <ArrowLeft size={14} />
        </button>
        <div className="w-px h-4 bg-slate-600 mx-0.5" />
        <button onClick={() => setTool("select")} className={`p-1 rounded ${tool === "select" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="選擇">
          <Move size={14} />
        </button>
        <button onClick={() => handleToolChange("pen")} className={`p-1 rounded ${tool === "pen" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="畫筆">
          <Pencil size={14} />
        </button>
        <button onClick={() => handleToolChange("eraser")} className={`p-1 rounded ${tool === "eraser" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="橡皮擦">
          <Eraser size={14} />
        </button>
        <button onClick={() => handleToolChange("rect")} className={`p-1 rounded ${tool === "rect" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="矩形">
          <Square size={14} />
        </button>
        <button onClick={() => handleToolChange("ellipse")} className={`p-1 rounded ${tool === "ellipse" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="橢圓">
          <Circle size={14} />
        </button>
        <button onClick={() => handleToolChange("line")} className={`p-1 rounded ${tool === "line" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="直線">
          <Minus size={14} />
        </button>
        <button onClick={() => { handleToolChange("highlighter"); if (!HIGHLIGHTER_COLORS.includes(color)) setColor("#fef08a") }} className={`p-1 rounded ${tool === "highlighter" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="螢光筆">
          <Highlighter size={14} />
        </button>
        <button onClick={() => handleToolChange("text")} className={`p-1 rounded ${tool === "text" ? "bg-sky-500 text-white" : "hover:bg-slate-700 text-white"}`} title="文字">
          <Type size={14} />
        </button>
        <div className="w-px h-4 bg-slate-600 mx-0.5" />
        {(tool === "highlighter" ? HIGHLIGHTER_COLORS : COLORS).map(c => (
          <button key={c} onClick={() => setColor(c)} className={`w-4 h-4 rounded-full border-2 ${color === c ? "border-sky-500" : "border-slate-600"}`} style={{ backgroundColor: c }} />
        ))}
        <div className="w-px h-4 bg-slate-600 mx-0.5" />
        <button onClick={undo} className="p-1 rounded hover:bg-slate-700 text-white" title="復原">
          <Undo2 size={14} />
        </button>
        <button onClick={redo} className="p-1 rounded hover:bg-slate-700 text-white" title="重做">
          <Redo2 size={14} />
        </button>
        <button onClick={clear} className="p-1 rounded hover:bg-red-900 text-red-400" title="清除">
          <Trash2 size={14} />
        </button>
        <div className="w-px h-4 bg-slate-600 mx-0.5" />
        <input
          type="color"
          value={boardColor}
          onChange={(e) => {
            setBoardColor(e.target.value)
            if (fabricRef.current) {
              fabricRef.current.setBackgroundColor(e.target.value, fabricRef.current.renderAll.bind(fabricRef.current))
            }
          }}
          className="h-6 w-6 cursor-pointer rounded border border-slate-600"
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
