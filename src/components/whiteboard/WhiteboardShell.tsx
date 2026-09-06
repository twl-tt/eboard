"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Play, Square, Moon, Sun, ZoomIn, ZoomOut,
  BookOpen, Highlighter, X, Languages, Maximize2, Minimize2, Brush, Sticker, Pencil
} from "lucide-react"
import type { ArticleFull, PhoneticMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { speakSeq, stopSpeak, warmVoices } from "@/lib/tts"
import { celebrate } from "@/lib/sound"
import { HIGHLIGHT_BG, HIGHLIGHT_LABEL, type Highlight, type HighlightColor } from "@/lib/highlight"
import { Button } from "@/components/ui/button"
import { ArticlePicker } from "./ArticlePicker"
import { ReadingPane } from "./ReadingPane"
import { CanvasStage, type CanvasApi, type CanvasTool } from "./CanvasStage"
import { ClassroomSuite } from "./ClassroomSuite"
import { ReorderMode } from "./ReorderMode"
import { DictLookup } from "./DictLookup"
import { StickerBar } from "./StickerBar"

  type Mode = "read"

const HIGHLIGHT_COLORS: HighlightColor[] = ["yellow", "green", "blue"]

export default function WhiteboardShell() {
  const router = useRouter()
  const [articleId, setArticleId] = useState<string | null>(null)
  const [article, setArticle] = useState<ArticleFull | null>(null)
  const [loadingArticle, setLoadingArticle] = useState(false)
  const [phonetic, setPhonetic] = useState<PhoneticMode>("off")
  const [voiceLang, setVoiceLang] = useState<"zh-HK" | "zh-TW">("zh-HK")
  const [fontSizeRem, setFontSizeRem] = useState(2.2)
  const [dark, setDark] = useState(true)
  const [focusMode, setFocusMode] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [speakingId, setSpeakingId] = useState("")
  const [speaking, setSpeaking] = useState(false)
  const [mode, setMode] = useState<"read">("read")
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [highlightColor, setHighlightColor] = useState<HighlightColor>("yellow")
  const [showExplanation, setShowExplanation] = useState(false)
  const [boardMode, setBoardMode] = useState<"normal" | "whiteboard" | "blackboard">("normal")
  const [boardColor, setBoardColor] = useState("#1f2937")
  const [blackboardData, setBlackboardData] = useState<string | null>(null)
  const blackboardDataRef = useRef<string | null>(null)
  const [whiteboardData, setWhiteboardData] = useState<string | null>(null)
  const whiteboardDataRef = useRef<string | null>(null)
  const [normalData, setNormalData] = useState<string | null>(null)
  const normalDataRef = useRef<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tags, setTags] = useState<{ id: string; name: string; category: string; color: string; sortOrder: number }[]>([])
  const [stickerBarOpen, setStickerBarOpen] = useState(false)
  const [canvasVisible, setCanvasVisible] = useState(true)
  const [canvasTool, setCanvasTool] = useState<CanvasTool>("pen")

  const canvasApiRef = useRef<CanvasApi>(null)
  const readingRef = useRef<HTMLDivElement>(null)
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    warmVoices()
    setDark(document.documentElement.classList.contains("dark"))
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        stopSpeak()
        setSpeaking(false)
        setSpeakingId("")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  useEffect(() => () => stopSpeak(), [])

  useEffect(() => {
    fetch("/api/tags").then((r) => r.ok ? r.json() : []).then(setTags).catch(() => {})
  }, [])

  useEffect(() => {
    if (!articleId) {
      setArticle(null)
      setHighlights([])
      return
    }
    setLoadingArticle(true)
    fetch(`/api/articles/${articleId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          setArticle(data)
          setHighlights(Array.isArray(data.highlights) ? data.highlights : [])
          setTimeout(() => {
            if (data.canvasState && canvasApiRef.current) canvasApiRef.current.load(data.canvasState?.state ?? null)
          }, 600)
        }
      })
      .finally(() => setLoadingArticle(false))
  }, [articleId])

  useEffect(() => {
    if (!article || !article.id) return
    const t = setTimeout(() => {
      fetch(`/api/articles/${article.id}/highlights`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlights })
      }).catch(() => {})
    }, 500)
    return () => clearTimeout(t)
  }, [highlights, article?.id])

  const addHighlight = useCallback(
    (h: { sentenceId: string; tokenStart: number; tokenEnd: number }) => {
      if (!article) return
      setHighlights((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          sentenceId: h.sentenceId,
          tokenStart: h.tokenStart,
          tokenEnd: h.tokenEnd,
          color: highlightColor,
          createdAt: new Date().toISOString()
        }
      ])
    },
    [article, highlightColor]
  )

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id))
  }, [])

  const speakableItems = useCallback(
    () =>
      (article?.sentences ?? [])
        .filter((s) => s.text.trim())
        .map((s) => ({ id: s.id, text: s.text })),
    [article]
  )

  function playAll() {
    if (speaking) {
      stopSpeak()
      setSpeaking(false)
      setSpeakingId("")
      return
    }
    setSpeaking(true)
    speakSeq(speakableItems(), voiceLang, {
      onStart: (id) => setSpeakingId(id),
      onDone: () => {
        setSpeaking(false)
        setSpeakingId("")
      }
    })
  }

  function toggleTheme() {
    setDark((v) => {
      const next = !v
      document.documentElement.classList.toggle("dark", next)
      try {
        localStorage.setItem("wrp-theme", next ? "dark" : "light")
      } catch {}
      return next
    })
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  useEffect(() => { blackboardDataRef.current = blackboardData }, [blackboardData])
  useEffect(() => { whiteboardDataRef.current = whiteboardData }, [whiteboardData])
  useEffect(() => { normalDataRef.current = normalData }, [normalData])

  useEffect(() => {
    if (boardMode === "blackboard" && blackboardDataRef.current) {
      canvasApiRef.current?.load(blackboardDataRef.current)
    } else if (boardMode === "whiteboard" && whiteboardDataRef.current) {
      canvasApiRef.current?.load(whiteboardDataRef.current)
    } else if (boardMode === "normal" && normalDataRef.current) {
      canvasApiRef.current?.load(normalDataRef.current)
    }
  }, [boardMode])

  function enterBoardMode(mode: "whiteboard" | "blackboard") {
    if (boardMode === "blackboard") {
      const data = canvasApiRef.current?.toDataURL?.() ?? null
      setBlackboardData(data)
      blackboardDataRef.current = data
    } else if (boardMode === "whiteboard") {
      const data = canvasApiRef.current?.toDataURL?.() ?? null
      setWhiteboardData(data)
      whiteboardDataRef.current = data
    } else if (boardMode === "normal") {
      const data = canvasApiRef.current?.toDataURL?.() ?? null
      setNormalData(data)
      normalDataRef.current = data
    }
    if (mode === "blackboard" && blackboardDataRef.current) {
      canvasApiRef.current?.load(blackboardDataRef.current)
    } else if (mode === "whiteboard" && whiteboardDataRef.current) {
      canvasApiRef.current?.load(whiteboardDataRef.current)
    }
    setBoardMode(mode)
    setCanvasVisible(true)
  }

  function exitBoardMode() {
    if (boardMode === "blackboard") {
      const data = canvasApiRef.current?.toDataURL?.() ?? null
      setBlackboardData(data)
      blackboardDataRef.current = data
      if (whiteboardDataRef.current) {
        canvasApiRef.current?.load(whiteboardDataRef.current)
      }
    } else if (boardMode === "whiteboard") {
      const data = canvasApiRef.current?.toDataURL?.() ?? null
      setWhiteboardData(data)
      whiteboardDataRef.current = data
      if (blackboardDataRef.current) {
        canvasApiRef.current?.load(blackboardDataRef.current)
      }
    } else if (boardMode === "normal") {
      const data = canvasApiRef.current?.toDataURL?.() ?? null
      setNormalData(data)
      normalDataRef.current = data
    }
    setBoardMode("normal")
  }

  async function addTagToSentence(sentenceIndex: number, tagName: string) {
    if (!article) return
    const s = article.sentences[sentenceIndex]
    const current = s.tags ?? []
    if (current.includes(tagName)) return
    const next = [...current, tagName]
    const res = await fetch(`/api/articles/${article.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentenceIndex, tags: next })
    })
    if (res.ok) {
      const updatedSentences = await res.json()
      setArticle((prev) => (prev ? { ...prev, sentences: updatedSentences } : prev))
    }
  }

  async function removeTagFromSentence(sentenceIndex: number, tagName: string) {
    if (!article) return
    const s = article.sentences[sentenceIndex]
    const next = (s.tags ?? []).filter((t) => t !== tagName)
    const res = await fetch(`/api/articles/${article.id}/tags`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentenceIndex, tags: next })
    })
    if (res.ok) {
      const updatedSentences = await res.json()
      setArticle((prev) => (prev ? { ...prev, sentences: updatedSentences } : prev))
    }
  }

  const tagsByCategory = useMemo(() => {
    const map = new Map<string, typeof tags>()
    for (const t of tags) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return map
  }, [tags])

  const phoneticOptions: { key: PhoneticMode; label: string }[] = [
    { key: "off", label: "隱藏拼音" },
    { key: "pinyin", label: "普通話拼音" }
  ]

  const validSentences = article?.sentences.filter((s) => s.text.trim()) ?? []

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative flex min-h-screen flex-col text-slate-900 transition-colors",
        "bg-gradient-to-br from-sky-50 via-white to-violet-50",
        "dark:bg-gradient-to-br dark:from-[#0a0f1e] dark:via-slate-950 dark:to-indigo-950 dark:text-slate-100"
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-sky-300/45 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-600/15" />
        <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-500/10" />
        <div className="dot-grid absolute inset-0 opacity-60 dark:opacity-30" />
      </div>

      <header
        className={cn(
          "relative z-30 mx-3 mt-3 flex flex-col gap-2 rounded-3xl border px-4 py-2.5 backdrop-blur-xl transition-colors",
          "border-white/70 bg-white/80 shadow-lg shadow-sky-200/40",
          "dark:border-white/10 dark:bg-slate-900/60 dark:shadow-lg dark:shadow-slate-900/40"
        )}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-600 text-xl shadow-lg shadow-indigo-500/30">
              📖
            </span>
            <div className="leading-tight">
              <h1 className="bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text text-lg font-black tracking-tight text-transparent dark:from-sky-400 dark:via-indigo-400 dark:to-violet-400">
                eBoard
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">eBoard</p>
            </div>
          </div>
          <ArticlePicker
            value={articleId}
            onChange={(id) => {
              stopSpeak()
              setSpeaking(false)
              setFocusId(null)
              setArticleId(id)
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-2xl border border-slate-200/80 bg-white/70 p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            {phoneticOptions.map((o) => (
              <button
                key={o.key}
                onClick={() => setPhonetic(o.key)}
                className={cn(
                  "rounded-xl px-3 py-1.5 text-sm font-medium transition-all",
                  phonetic === o.key
                    ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-sky-500/30"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <select
            value={voiceLang}
            onChange={(e) => setVoiceLang(e.target.value as "zh-HK" | "zh-TW")}
            className="h-9 rounded-xl border border-slate-300 bg-white/80 px-2.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800/80"
            aria-label="朗讀語言"
          >
            <option value="zh-HK">🇭🇰 粵語 zh-HK</option>
            <option value="zh-TW">🇹🇼 國語 zh-TW</option>
          </select>
          <Button
            size="sm"
            variant={speaking ? "destructive" : "default"}
            onClick={playAll}
            disabled={!article}
            className={cn(!speaking && article && "shadow-md shadow-sky-500/30")}
          >
            {speaking ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {speaking ? "停止" : "▶ 朗讀全文"}
          </Button>

          <span className="mx-1 hidden h-6 w-px bg-slate-300/70 sm:block dark:bg-slate-700/70" />

          <div className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white/70 p-1 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/60">
            <Highlighter className="ml-1 h-4 w-4 text-slate-500" />
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setHighlightColor(c)}
                title={`${HIGHLIGHT_LABEL[c]}色螢光筆`}
                className={cn(
                  "h-6 w-6 rounded-full transition-transform hover:scale-110",
                  highlightColor === c ? "ring-2 ring-slate-700 dark:ring-white" : "ring-2 ring-transparent"
                )}
                style={{ backgroundColor: HIGHLIGHT_BG[c].replace(",0.32", ",0.85") }}
              />
            ))}
            <button
              onClick={() => article && setHighlights([])}
              disabled={highlights.length === 0}
              className="ml-1 flex h-6 items-center gap-0.5 rounded-md px-1.5 text-xs text-slate-500 hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-slate-700"
              title="清除全部螢光筆"
            >
              <X className="h-3 w-3" /> {highlights.length}
            </button>
          </div>

          <Button
            size="sm"
            variant={showExplanation ? "default" : "ghost"}
            onClick={() => setShowExplanation(v => !v)}
            title="顯示/隱藏語譯"
            className={cn(showExplanation && "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300")}
          >
            <Languages className="h-4 w-4" /> 語譯
          </Button>

          <span className="mx-1 hidden h-6 w-px bg-slate-300/70 sm:block dark:bg-slate-700/70" />

          <Button size="icon" variant="ghost" title="縮小字體" onClick={() => setFontSizeRem((v) => Math.max(1.6, +(v - 0.2).toFixed(1)))}>
            <ZoomOut className="h-5 w-5" />
          </Button>
          <span className="w-12 rounded-lg bg-slate-200/80 py-1 text-center text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
            {fontSizeRem.toFixed(1)}
          </span>
          <Button size="icon" variant="ghost" title="放大字體" onClick={() => setFontSizeRem((v) => Math.min(3.4, +(v + 0.2).toFixed(1)))}>
            <ZoomIn className="h-5 w-5" />
          </Button>

          <Button size="icon" variant="ghost" onClick={toggleTheme} title="深淺色切換">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <DictLookup />

          <Button
            size="icon"
            variant={stickerBarOpen ? "default" : "ghost"}
            onClick={() => setStickerBarOpen((v) => !v)}
            title="貼紙標籤（拖到白板任意位置）"
          >
            <Sticker className="h-5 w-5" />
          </Button>

          <Button
            size="sm"
            variant={canvasVisible ? "default" : "ghost"}
            onClick={() => setCanvasVisible(v => !v)}
            title="畫板"
          >
            <Pencil className="h-4 w-4" /> 畫板
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open("/blackboard", "_blank")}
            title="新視窗開啟黑板"
            className="text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Square className="h-4 w-4" /> 新黑板
          </Button>
          {boardMode === "blackboard" && (
            <input
              type="color"
              value={boardColor}
              onChange={(e) => setBoardColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border-0 p-0"
              title="選擇黑板顏色"
            />
          )}

          <Button
            size="icon"
            variant={isFullscreen ? "default" : "ghost"}
            onClick={toggleFullscreen}
            title={isFullscreen ? "退出全螢幕" : "進入全螢幕"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>

          <span className="mx-1 hidden h-6 w-px bg-slate-300/70 sm:block dark:bg-slate-700/70" />

          <a
            href="/admin"
            className="ml-1 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
          >
            管理後台 →
          </a>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-3 pb-32 pt-3">
        {mode === "read" && !article && (
          <div className="flex h-[calc(100vh-180px)] gap-3">
              <div ref={readingRef} className="relative flex-1 rounded-3xl shadow-2xl overflow-hidden">
              <CanvasStage
                ref={canvasApiRef}
                articleId=""
                boardColor={boardMode === "blackboard" ? boardColor : boardMode === "whiteboard" ? "#ffffff" : boardMode === "normal" ? "#1f2937" : null}
                containerRef={readingRef}
                currentTool={canvasTool}
                onToolChange={setCanvasTool}
              />
            </div>
          </div>
        )}

        {mode === "read" && article && (
          <>
            <div className="grid h-[calc(100vh-180px)] grid-cols-1">
                <div className="relative h-full">
                <div
                  ref={readingRef}
                  className={cn(
                    "relative h-full overflow-y-auto rounded-3xl p-7 pb-24 ring-1 backdrop-blur",
                    boardMode === "blackboard"
                      ? "bg-slate-900 shadow-2xl shadow-slate-900 ring-slate-700"
                      : boardMode === "whiteboard"
                      ? "bg-white shadow-2xl shadow-sky-200 ring-slate-200"
                      : "bg-slate-900 shadow-2xl shadow-slate-900 ring-slate-700"
                  )}
                  onDragOver={(e) => {
                    if (e.dataTransfer.types.includes("application/x-sticker")) {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "copy"
                    }
                  }}
                  onDrop={(e) => {
                    const tagId = e.dataTransfer.getData("application/x-sticker")
                    if (!tagId) return
                    e.preventDefault()
                    setStickerBarOpen(false)
                  }}
                >
                  {canvasVisible && (
                    <CanvasStage
                      ref={canvasApiRef}
                      articleId={article.id}
                      boardColor={boardMode === "blackboard" ? boardColor : boardMode === "whiteboard" ? "#ffffff" : null}
                      containerRef={readingRef as React.RefObject<HTMLDivElement>}
                      currentTool={canvasTool}
                      onToolChange={setCanvasTool}
                    />
                  )}
                  <div className="mb-4 h-1.5 w-28 rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500" />
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-2 border-b border-dashed border-slate-300 pb-4 dark:border-slate-700">
                    <h2 className="text-2xl font-black tracking-tight">{article.title}</h2>
                    <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
                      {article.grade && (
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-sky-700 dark:text-sky-300">{article.grade}</span>
                      )}
                      <span className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-indigo-700 dark:text-indigo-300">{article.categoryName}</span>
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">{validSentences.length} 句</span>
                      {highlights.length > 0 && (
                        <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-amber-700 dark:text-amber-300">🖍 {highlights.length} 處螢光筆</span>
                      )}
                    </div>
                  </div>
                  <ReadingPane
                    sentences={article.sentences}
                    phonetic={phonetic}
                    fontSizeRem={fontSizeRem}
                    focusMode={focusMode}
                    focusId={focusId}
                    speakingId={speakingId}
                    voiceLang={voiceLang}
                    highlights={highlights}
                    onAddHighlight={addHighlight}
                    onRemoveHighlight={removeHighlight}
                    onSentenceClick={(s) => {
                      if (focusMode) {
                        setFocusId(s.id === focusId ? null : s.id)
                        celebrate(0.5, 0.35)
                      }
                    }}
                    showExplanation={showExplanation}
                  />
                </div>
              </div>
            </div>
          </>
        )}
        <StickerBar tags={tags} open={stickerBarOpen} onClose={() => setStickerBarOpen(false)} onDragStart={() => {}} onDragEnd={() => {}} />
      </main>

      <ClassroomSuite />
    </div>
  )
}
