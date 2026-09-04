"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Play, Square, Moon, Sun, ZoomIn, ZoomOut, Crosshair, Save, FileDown,
  BookOpen, Puzzle, Loader2, Highlighter, X, Languages, Lock, Unlock, Maximize2, Minimize2, Brush, Sticker
} from "lucide-react"
import type { ArticleFull, PhoneticMode } from "@/lib/types"
import { cn } from "@/lib/utils"
import { speakSeq, stopSpeak, warmVoices } from "@/lib/tts"
import { celebrate } from "@/lib/sound"
import { HIGHLIGHT_BG, HIGHLIGHT_LABEL, type Highlight, type HighlightColor } from "@/lib/highlight"
import { Button } from "@/components/ui/button"
import { ArticlePicker } from "./ArticlePicker"
import { ReadingPane } from "./ReadingPane"
import { CanvasStage, type CanvasApi } from "./CanvasStage"
import { ClassroomSuite } from "./ClassroomSuite"
import { ReorderMode } from "./ReorderMode"
import { DictLookup } from "./DictLookup"
import { StickerBar } from "./StickerBar"

type Mode = "read" | "reorder"

const HIGHLIGHT_COLORS: HighlightColor[] = ["purple", "red", "blue"]

export default function WhiteboardShell() {
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
  const [mode, setMode] = useState<Mode>("read")
  const [savingCanvas, setSavingCanvas] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [highlightColor, setHighlightColor] = useState<HighlightColor>("purple")
  const [showExplanation, setShowExplanation] = useState(false)
  const [canvasFollowsText, setCanvasFollowsText] = useState(false)
  const [boardMode, setBoardMode] = useState<"normal" | "whiteboard" | "blackboard">("normal")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [tags, setTags] = useState<{ id: string; name: string; category: string; color: string; sortOrder: number }[]>([])
  const [stickerBarOpen, setStickerBarOpen] = useState(false)

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
    const el = readingRef.current
    if (!el) return
    let isDown = false
    let startX = 0
    let startY = 0
    let startScroll = 0
    let moved = false
    const EDGE = 6
    function onDown(e: PointerEvent) {
      if (e.button !== 0 && e.pointerType === "mouse") return
      const target = e.target as HTMLElement
      if (target.closest("[data-tk]") || target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) return
      isDown = true
      moved = false
      startX = e.clientX
      startY = e.clientY
      if (el) startScroll = el.scrollTop
      el?.setPointerCapture(e.pointerId)
    }
    function onMove(e: PointerEvent) {
      if (!isDown) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (!moved && Math.abs(dx) < EDGE && Math.abs(dy) < EDGE) return
      moved = true
      if (el) el.scrollTop = startScroll - dy
      e.preventDefault()
    }
    function onUp(e: PointerEvent) {
      if (!isDown) return
      isDown = false
      try { el?.releasePointerCapture(e.pointerId) } catch {}
    }
    el.addEventListener("pointerdown", onDown)
    el.addEventListener("pointermove", onMove)
    el.addEventListener("pointerup", onUp)
    el.addEventListener("pointercancel", onUp)
    return () => {
      el.removeEventListener("pointerdown", onDown)
      el.removeEventListener("pointermove", onMove)
      el.removeEventListener("pointerup", onUp)
      el.removeEventListener("pointercancel", onUp)
    }
  }, [articleId])

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
            if (data.canvasState && canvasApiRef.current) canvasApiRef.current.load(data.canvasState)
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

  async function saveCanvas() {
    if (!article || !canvasApiRef.current) return
    setSavingCanvas(true)
    try {
      await fetch(`/api/articles/${article.id}/canvas`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: JSON.parse(canvasApiRef.current.toJSON() ?? "null") })
      })
    } finally {
      setSavingCanvas(false)
    }
  }

  async function exportPdf() {
    if (!article || !readingRef.current || exporting) return
    setExporting(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ])
      const baseCanvas = await html2canvas(readingRef.current, {
        scale: 2,
        backgroundColor: dark ? "#0a0f1e" : "#ffffff",
        logging: false
      })
      const tmp = document.createElement("canvas")
      tmp.width = baseCanvas.width
      tmp.height = baseCanvas.height
      const ctx = tmp.getContext("2d")!
      ctx.drawImage(baseCanvas, 0, 0)
      if (canvasApiRef.current && !canvasApiRef.current.isEmpty()) {
        const overlay = canvasApiRef.current.toDataURL()
        if (overlay) {
          await new Promise<void>((resolve) => {
            const img = new Image()
            img.onload = () => {
              ctx.drawImage(img, 0, 0, tmp.width, tmp.height)
              resolve()
            }
            img.onerror = () => resolve()
            img.src = overlay
          })
        }
      }
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const ratio = Math.min(pw / tmp.width, ph / tmp.height)
      const w = tmp.width * ratio
      const h = tmp.height * ratio
      pdf.addImage(tmp.toDataURL("image/png"), "PNG", (pw - w) / 2, (ph - h) / 2, w, h)
      pdf.save(`${article.title}-白板筆記.pdf`)
    } finally {
      setExporting(false)
    }
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
      shellRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  function enterBoardMode(mode: "whiteboard" | "blackboard") {
    setBoardMode(mode)
    setTimeout(() => {
      canvasApiRef.current?.toJSON()
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("board-mode", { detail: mode }))
      }
    }, 0)
  }

  function exitBoardMode() {
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

  const modes: { key: Mode; label: string; icon: React.ReactNode }[] = [
    { key: "read", label: "語文分析模式", icon: <BookOpen className="h-4 w-4" /> },
    { key: "reorder", label: "卡片重組模式", icon: <Puzzle className="h-4 w-4" /> }
  ]

  const validSentences = article?.sentences.filter((s) => s.text.trim()) ?? []

  return (
    <div
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
          <div className="ml-auto flex items-center gap-1 rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800/80">
            {modes.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  "relative rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors",
                  mode === m.key ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                {mode === m.key && (
                  <motion.span
                    layoutId="modePill"
                    className="absolute inset-0 rounded-xl bg-white shadow-md dark:bg-slate-700"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">{m.icon} {m.label}</span>
              </button>
            ))}
          </div>
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

          <Button
            size="sm"
            variant={focusMode ? "amber" : "ghost"}
            onClick={() => {
              setFocusMode((v) => !v)
              setFocusId(null)
            }}
            title="聚焦模式"
            className={cn(focusMode && "shadow-md shadow-amber-500/40")}
          >
            <Crosshair className="h-4 w-4" /> 聚焦
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
            variant={boardMode === "whiteboard" ? "default" : "ghost"}
            onClick={() => (boardMode === "whiteboard" ? exitBoardMode() : enterBoardMode("whiteboard"))}
            title="純白板模式（隱藏文字）"
            className={cn(boardMode === "whiteboard" && "bg-sky-500/20 text-sky-700 hover:bg-sky-500/30 dark:bg-sky-500/20 dark:text-sky-300")}
          >
            <Brush className="h-4 w-4" /> 白板
          </Button>
          <Button
            size="sm"
            variant={boardMode === "blackboard" ? "default" : "ghost"}
            onClick={() => (boardMode === "blackboard" ? exitBoardMode() : enterBoardMode("blackboard"))}
            title="純黑板模式（隱藏文字）"
            className={cn(
              boardMode === "blackboard"
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "text-slate-700 hover:bg-slate-200 dark:text-slate-200 dark:hover:bg-slate-700"
            )}
          >
            <Square className="h-4 w-4" /> 黑板
          </Button>

          <Button
            size="icon"
            variant={isFullscreen ? "default" : "ghost"}
            onClick={toggleFullscreen}
            title={isFullscreen ? "退出全螢幕" : "進入全螢幕"}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>

          <Button
            size="sm"
            variant={canvasFollowsText ? "default" : "ghost"}
            onClick={() => setCanvasFollowsText((v) => !v)}
            title={canvasFollowsText ? "畫板跟隨文字 — 點擊切換為固定" : "畫板固定在畫面 — 點擊切換為跟隨文字"}
            className={cn(canvasFollowsText && "bg-amber-500/20 text-amber-700 hover:bg-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300")}
          >
            {canvasFollowsText ? <><Lock className="h-4 w-4" /> 跟隨</> : <><Unlock className="h-4 w-4" /> 固定</>}
          </Button>

          <span className="mx-1 hidden h-6 w-px bg-slate-300/70 sm:block dark:bg-slate-700/70" />

          <Button size="sm" variant="secondary" onClick={saveCanvas} disabled={!article || savingCanvas} title="儲存白板圖層">
            {savingCanvas ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 儲存畫板
          </Button>
          <Button size="sm" variant="outline" onClick={exportPdf} disabled={!article || exporting} title="匯出 PDF 筆記">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} 匯出 PDF
          </Button>
          <a
            href="/admin"
            className="ml-1 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
          >
            管理後台 →
          </a>
        </div>
      </header>

      <main className="relative z-10 flex-1 px-3 pb-32 pt-3">
        {!article && mode === "read" && (
          <div className="flex h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-2xl shadow-sky-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-2xl dark:shadow-slate-900/40"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-500/15" />
                <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-500/15" />
              </div>
              <div className="relative">
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">eBoard</p>
                <h2 className="mt-2 text-2xl font-black leading-tight">
                  請選擇一篇課文開始
                </h2>
              </div>
            </motion.div>
          </div>
        )}

        {mode === "read" && article && (
          <div className="grid h-[calc(100vh-180px)] grid-cols-1 gap-3 lg:grid-cols-[1fr_460px]">
            <div
              ref={readingRef}
              className={cn(
                "relative overflow-y-auto rounded-3xl p-7 pb-24 ring-1 backdrop-blur",
                "bg-white/90 shadow-2xl shadow-sky-200/50 ring-slate-200/80",
                "dark:bg-slate-900/85 dark:shadow-2xl dark:shadow-slate-900/40 dark:ring-white/10",
                boardMode === "blackboard" && "bg-slate-900 ring-slate-700",
                boardMode === "whiteboard" && "bg-white ring-slate-200"
              )}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("application/x-sticker")) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "copy"
                }
              }}
              onDrop={(e) => {
                const tagId = e.dataTransfer.getData("application/x-sticker")
                if (!tagId || !canvasApiRef.current) return
                e.preventDefault()
                const tag = tags.find((t) => t.id === tagId)
                if (!tag) return
                const COLORS: Record<string, string> = { violet: "#a78bfa", rose: "#fb7185", amber: "#fbbf24", emerald: "#34d399", sky: "#38bdf8", fuchsia: "#e879f9" }
                canvasApiRef.current.addSticker(tag.name, COLORS[tag.color] ?? "#a78bfa")
                setStickerBarOpen(false)
              }}
            >
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
              <div className="mb-4 inline-block rounded-full bg-slate-900/5 px-3 py-1 text-[10px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
                拖選文字上螢光筆 / 點擊反白可刪除
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
            <div
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("application/x-sticker")) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = "copy"
                }
              }}
              onDrop={(e) => {
                const tagId = e.dataTransfer.getData("application/x-sticker")
                if (!tagId || !canvasApiRef.current) return
                e.preventDefault()
                const tag = tags.find((t) => t.id === tagId)
                if (!tag) return
                const COLORS: Record<string, string> = { violet: "#a78bfa", rose: "#fb7185", amber: "#fbbf24", emerald: "#34d399", sky: "#38bdf8", fuchsia: "#e879f9" }
                canvasApiRef.current.addSticker(tag.name, COLORS[tag.color] ?? "#a78bfa")
                setStickerBarOpen(false)
              }}
              className="relative overflow-hidden rounded-3xl bg-slate-50 shadow-2xl ring-1 ring-slate-200/80 dark:bg-slate-900/60 dark:ring-slate-700/60"
            >
              <CanvasStage
                ref={canvasApiRef}
                articleId={article.id}
                dark={boardMode === "blackboard" || (boardMode === "normal" && dark)}
                followsText={false}
                scrollContainerRef={null}
                forceActive={boardMode !== "normal"}
                canvasTopOffset={0}
              />
            </div>
          </div>
        )}

        {mode === "reorder" && article && (
          <div className="mx-auto h-full max-w-4xl rounded-3xl bg-white/90 p-6 shadow-2xl shadow-sky-200/40 ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-900/85 dark:shadow-2xl dark:shadow-slate-900/40 dark:ring-white/10">
            <ReorderMode sentences={article.sentences} />
          </div>
        )}
        {mode === "reorder" && !article && (
          <div className="flex h-full items-center justify-center text-lg text-slate-400">請先選擇一篇課文進行卡片重組。</div>
        )}
        <StickerBar tags={tags} open={stickerBarOpen} onClose={() => setStickerBarOpen(false)} onDragStart={() => {}} onDragEnd={() => {}} />
      </main>

      <ClassroomSuite />
    </div>
  )
}
