"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { X, Pencil, Eraser, Square, Circle, Trash2, Minus, Highlighter, Type, Move, Undo2, Redo2 } from "lucide-react"

export type CanvasTool = "select" | "pen" | "eraser" | "rect" | "ellipse" | "line" | "highlighter" | "text"

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
  currentTool?: CanvasTool
  onToolChange?: (tool: CanvasTool) => void
}

export const CanvasStage = forwardRef<CanvasApi, Props>(function CanvasStage({ articleId, boardColor, containerRef, currentTool, onToolChange }, ref) {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<any>(null)
  const fabricModuleRef = useRef<any>(null)
  const [tool, setTool] = useState<CanvasTool>(currentTool || "pen")
  const [color, setColor] = useState("#dc2626")
  const [visible, setVisible] = useState(true)
  const isDownRef = useRef(false)
  const startPointRef = useRef<any>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const toolRef = useRef<CanvasTool>(currentTool || "pen")
  const colorRef = useRef("#dc2626")

  useEffect(() => { toolRef.current = tool }, [tool])
  useEffect(() => { colorRef.current = color }, [color])
  useEffect(() => {
    if (currentTool && currentTool !== tool) {
      setTool(currentTool)
      toolRef.current = currentTool
      if (fabricRef.current) {
        fabricRef.current.setToolMode(currentTool)
      }
    }
  }, [currentTool])

  useEffect(() => {
    if (!canvasElRef.current || !containerRef.current) return

    let canvas: any
    let isDrawing = false
    let startPoint: any = null
    let currentShape: any = null

    const init = async () => {
      const { fabric } = await import("fabric")
      fabricModuleRef.current = fabric

      const container = containerRef.current!
      const rect = container.getBoundingClientRect()

      canvas = new fabric.Canvas(canvasElRef.current, {
        width: rect.width,
        height: rect.height,
        backgroundColor: boardColor || null,
        selection: true
      })
      fabricRef.current = canvas

      if (boardColor) {
        canvas.setBackgroundColor(boardColor, canvas.renderAll.bind(canvas))
      } else {
        canvas.setBackgroundColor(null, canvas.renderAll.bind(canvas))
        canvas.backgroundColor = null
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
            canvas.freeDrawingBrush.color = boardColor || "#1f2937"
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

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose()
        fabricRef.current = null
      }
    }
  }, [boardColor, containerRef])

  useEffect(() => {
    if (!fabricRef.current) return
    fabricRef.current.setToolMode(tool)
  }, [tool])

  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === "eraser" ? (boardColor || "#1f2937") : color
    }
  }, [color, tool, boardColor])

  useImperativeHandle(ref, () => ({
    toJSON: () => fabricRef.current ? JSON.stringify(fabricRef.current.toJSON()) : null,
    load: (data: string | null) => {
      if (!data || !fabricRef.current) return
      if (data.startsWith("data:image")) {
        fabricModuleRef.current.Image.fromURL(data, (img: any) => {
          fabricRef.current.clear()
          if (boardColor) {
            fabricRef.current.setBackgroundColor(boardColor, fabricRef.current.renderAll.bind(fabricRef.current))
          }
          fabricRef.current.add(img)
          fabricRef.current.renderAll()
        })
        return
      }
      try {
        const parsed = JSON.parse(data)
        fabricRef.current.loadFromJSON(parsed).then(() => {
          fabricRef.current.renderAll()
        })
      } catch (e) {
        console.error("Failed to load canvas data", e)
      }
    },
    toDataURL: () => fabricRef.current ? fabricRef.current.toDataURL() : null,
    isEmpty: () => !fabricRef.current || fabricRef.current.getObjects().length === 0,
    clear: () => {
      if (!fabricRef.current) return
      fabricRef.current.clear()
      if (boardColor) {
        fabricRef.current.setBackgroundColor(boardColor, fabricRef.current.renderAll.bind(fabricRef.current))
      }
    },
    undo: () => {
      if (historyIndexRef.current <= 0 || !fabricRef.current) return false
      historyIndexRef.current--
      const json = historyRef.current[historyIndexRef.current]
      if (json) {
        fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
          fabricRef.current.renderAll()
        })
      }
      return true
    },
    redo: () => {
      if (historyIndexRef.current >= historyRef.current.length - 1 || !fabricRef.current) return false
      historyIndexRef.current++
      const json = historyRef.current[historyIndexRef.current]
      if (json) {
        fabricRef.current.loadFromJSON(JSON.parse(json)).then(() => {
          fabricRef.current.renderAll()
        })
      }
      return true
    }
  }))

  const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#16a34a", "#ea580c", "#eab308"]
  const HIGHLIGHTER_COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe"]

  if (!visible) return null

  const handleToolChange = (newTool: CanvasTool) => {
    setTool(newTool)
    onToolChange?.(newTool)
  }

  return (
    <>
      <div className="absolute inset-0 z-40">
        <canvas ref={canvasElRef} />
      </div>
      <div className="absolute top-0 left-2 flex items-center gap-0.5 rounded-lg border border-slate-200/50 bg-white/90 px-2 py-1 shadow-md dark:border-slate-700/50 dark:bg-slate-900/90 z-50 overflow-x-auto max-w-[calc(100vw-16px)]">
        <button onClick={() => setVisible(false)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
          <X size={14} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        <button onClick={() => handleToolChange("select")} className={`p-1 rounded ${tool === "select" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="選擇">
          <Move size={14} />
        </button>
        <button onClick={() => handleToolChange("pen")} className={`p-1 rounded ${tool === "pen" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="畫筆">
          <Pencil size={14} />
        </button>
        <button onClick={() => handleToolChange("eraser")} className={`p-1 rounded ${tool === "eraser" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="橡皮擦">
          <Eraser size={14} />
        </button>
        <button onClick={() => handleToolChange("rect")} className={`p-1 rounded ${tool === "rect" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="矩形">
          <Square size={14} />
        </button>
        <button onClick={() => handleToolChange("ellipse")} className={`p-1 rounded ${tool === "ellipse" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="橢圓">
          <Circle size={14} />
        </button>
        <button onClick={() => handleToolChange("line")} className={`p-1 rounded ${tool === "line" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="直線">
          <Minus size={14} />
        </button>
        <button onClick={() => { handleToolChange("highlighter"); if (!HIGHLIGHTER_COLORS.includes(color)) setColor("#fef08a") }} className={`p-1 rounded ${tool === "highlighter" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="螢光筆">
          <Highlighter size={14} />
        </button>
        <button onClick={() => handleToolChange("text")} className={`p-1 rounded ${tool === "text" ? "bg-sky-500 text-white" : "hover:bg-slate-100"}`} title="文字">
          <Type size={14} />
        </button>
        <div className="w-px h-4 bg-slate-300 mx-0.5" />
        {(tool === "highlighter" ? HIGHLIGHTER_COLORS : COLORS).map(c => (
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
