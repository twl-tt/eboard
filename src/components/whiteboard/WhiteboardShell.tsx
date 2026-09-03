"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
  Play, Square, Moon, Sun, ZoomIn, ZoomOut, Crosshair, Save, FileDown,
  BookOpen, Puzzle, Loader2, Highlighter, X, Languages
} from "lucide-react"
import type { ArticleFull, PhoneticMode, RhetoricKey } from "@/lib/types"
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

type Mode = "read" | "reorder"

const HIGHLIGHT_COLORS: HighlightColor[] = ["purple", "red", "blue"]

export default function WhiteboardShell() {
  const [articleId, setArticleId] = useState<string | null>(null)
  const [article, setArticle] = useState<ArticleFull | null>(null)
  const [loadingArticle, setLoadingArticle] = useState(false)
  const [phonetic, setPhonetic] = useState<PhoneticMode>("pinyin")
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

  const canvasApiRef = useRef<CanvasApi>(null)
  const readingRef = useRef<HTMLDivElement>(null)

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

  const handleDropRhetoric = useCallback(
    async (sentenceId: string, rhetoric: RhetoricKey) => {
      if (!article) return
      const si = article.sentences.findIndex((s) => s.id === sentenceId)
      if (si === -1) return
      try {
        const res = await fetch(`/api/articles/${article.id}/token`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sentenceIndex: si, rhetoric })
        })
        if (res.ok) {
          const updated = await res.json()
          setArticle((prev) =>
            prev ? { ...prev, sentences: updated } : prev
          )
        }
      } catch {}
    },
    [article]
  )

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
        "relative flex h-screen flex-col overflow-hidden text-slate-900 transition-colors",
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
                Whiteboard Reader Pro
              </h1>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">校本智慧電子白板教學平台</p>
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

      <main className="relative z-10 min-h-0 flex-1 px-3 pb-16 pt-3">
        {!article && mode === "read" && (
          <div className="flex h-full items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-2xl shadow-sky-200/50 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:shadow-2xl dark:shadow-slate-900/40"
            >
              <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-300/40 blur-3xl dark:bg-sky-500/15" />
                <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-violet-300/40 blur-3xl dark:bg-violet-500/15" />
              </div>
              <div className="relative">
                <div className="relative mb-5 flex justify-center">
                  <span className="absolute -left-12 -top-2 text-3xl animate-bounce [animation-delay:-0.5s]">✏️</span>
                  <span className="text-6xl">📖</span>
                  <span className="absolute -right-12 bottom-0 text-3xl animate-bounce [animation-delay:-1.2s]">🎨</span>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-600 dark:text-sky-300">Whiteboard Reader Pro</p>
                <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                  讓每一篇課文，<br />
                  <span className="bg-gradient-to-r from-sky-500 via-indigo-500 to-violet-500 bg-clip-text text-transparent">
                    在電子白板上活起來
                  </span>
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  自動生成普通話拼音與廣東話粵拼、文字直接上螢光筆、加上畫筆與課室互動工具 — 專為大螢幕教學而設計。
                </p>
              </div>
              <div className="relative mt-7 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
                {[
                  { icon: "🖍", t: "文字螢光筆", d: "拖選直接反白", g: "from-fuchsia-500 to-pink-500" },
                  { icon: "🔊", t: "雙語朗讀", d: "粵/國逐句跟讀", g: "from-indigo-500 to-blue-600" },
                  { icon: "🎨", t: "自由白板", d: "畫筆+圖片+文字", g: "from-violet-500 to-fuchsia-500" },
                  { icon: "🧩", t: "卡片重組", d: "句序拖放", g: "from-amber-400 to-orange-500" },
                  { icon: "🎲", t: "隨機抽籤", d: "轉盤+快速加分", g: "from-emerald-400 to-teal-600" },
                  { icon: "📊", t: "即時投票", d: "QR 掃碼・柱狀圖", g: "from-rose-400 to-pink-600" }
                ].map((f) => (
                  <div
                    key={f.t}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800/60"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-base text-white shadow-md ${f.g}`}>
                      {f.icon}
                    </span>
                    <div className="leading-tight">
                      <p className="text-sm font-bold">{f.t}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{f.d}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
                <a
                  href="/admin"
                  className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-105"
                >
                  ＋ 前往管理後台匯入課文
                </a>
                <span className="text-xs text-slate-500 dark:text-slate-400">或在上方選單直接選擇課文</span>
              </div>
            </motion.div>
          </div>
        )}

        {mode === "read" && article && (
          <div className="relative h-full">
            <div
              ref={readingRef}
              className={cn(
                "absolute inset-0 overflow-y-auto rounded-3xl p-7 pb-24 ring-1 backdrop-blur",
                "bg-white/90 shadow-2xl shadow-sky-200/50 ring-slate-200/80",
                "dark:bg-slate-900/85 dark:shadow-2xl dark:shadow-slate-900/40 dark:ring-white/10"
              )}
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
              <div className="absolute right-6 top-6 rounded-full bg-slate-900/5 px-3 py-1 text-[10px] text-slate-500 dark:bg-white/5 dark:text-slate-400">
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
                onDropRhetoric={handleDropRhetoric}
              />
            </div>
            <CanvasStage ref={canvasApiRef} articleId={article.id} dark={dark} />
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
      </main>

      <ClassroomSuite />
    </div>
  )
}
