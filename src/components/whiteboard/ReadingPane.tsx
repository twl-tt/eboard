"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ArticleFull, PhoneticMode, Sentence, TagDTO } from "@/lib/types"
import { cn, isHanzi } from "@/lib/utils"
import { speakSeq } from "@/lib/tts"
import { HIGHLIGHT_BG, type Highlight, type HighlightColor } from "@/lib/highlight"
import { Tag, X } from "lucide-react"

const TAG_COLOR: Record<string, string> = {
  violet: "bg-violet-500/20 border-violet-500/50 text-violet-700 dark:text-violet-200",
  rose: "bg-rose-500/20 border-rose-500/50 text-rose-700 dark:text-rose-200",
  amber: "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-200",
  emerald: "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-200",
  sky: "bg-sky-500/20 border-sky-500/50 text-sky-700 dark:text-sky-200",
  fuchsia: "bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-700 dark:text-fuchsia-200"
}

interface Props {
  sentences: Sentence[]
  phonetic: PhoneticMode
  fontSizeRem: number
  focusMode: boolean
  focusId: string | null
  speakingId: string
  voiceLang: "zh-HK" | "zh-TW"
  onSentenceClick: (s: Sentence) => void
  highlights: Highlight[]
  onAddHighlight: (h: { sentenceId: string; tokenStart: number; tokenEnd: number }) => void
  onRemoveHighlight: (id: string) => void
  showExplanation?: boolean
  tags?: TagDTO[]
  onAddTag?: (sentenceIndex: number, tagName: string) => void
  onRemoveTag?: (sentenceIndex: number, tagName: string) => void
}

function TagPopover({
  sentenceIndex,
  currentTags,
  availableTags,
  onAdd,
  onRemove,
  onClose
}: {
  sentenceIndex: number
  currentTags: string[]
  availableTags: TagDTO[]
  onAdd: (i: number, name: string) => void
  onRemove: (i: number, name: string) => void
  onClose: () => void
}) {
  const byCat = useMemo(() => {
    const map = new Map<string, TagDTO[]>()
    for (const t of availableTags) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return map
  }, [availableTags])
  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[360px] max-w-[90vw] rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95" onClick={(e) => e.stopPropagation()}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500">貼上標籤（句子 {sentenceIndex + 1}）</p>
        <button onClick={onClose} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
          <X className="h-4 w-4" />
        </button>
      </div>
      {availableTags.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-400">尚未有標籤，請到管理後台新增。</p>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {Array.from(byCat.entries()).map(([cat, list]) => (
            <div key={cat}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{cat}</p>
              <div className="flex flex-wrap gap-1">
                {list.map((t) => {
                  const on = currentTags.includes(t.name)
                  return (
                    <button
                      key={t.id}
                      onClick={() => (on ? onRemove(sentenceIndex, t.name) : onAdd(sentenceIndex, t.name))}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold transition-all",
                        on
                          ? cn(TAG_COLOR[t.color] ?? TAG_COLOR.violet, "ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900")
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      )}
                    >
                      {on ? "✓ " : ""}{t.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ReadingPane({
  sentences,
  phonetic,
  fontSizeRem,
  focusMode,
  focusId,
  speakingId,
  voiceLang,
  onSentenceClick,
  highlights,
  onAddHighlight,
  onRemoveHighlight,
  showExplanation = false,
  tags = [],
  onAddTag,
  onRemoveTag
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [openTagFor, setOpenTagFor] = useState<number | null>(null)
  const tagColorByName = useMemo(() => {
    const map = new Map<string, string>()
    for (const t of tags) map.set(t.name, t.color)
    return map
  }, [tags])
  const hlBySentence = useMemo(() => {
    const map = new Map<string, Highlight[]>()
    for (const h of highlights) {
      const list = map.get(h.sentenceId) ?? []
      list.push(h)
      map.set(h.sentenceId, list)
    }
    return map
  }, [highlights])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return
    let lastUp = 0
    const handler = () => {
      const now = Date.now()
      if (now - lastUp < 50) return
      lastUp = now
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) return
      const all = Array.from(root.querySelectorAll<HTMLElement>("[data-tk]"))
      if (all.length === 0) return
      let firstIdx = -1
      let lastIdx = -1
      for (let i = 0; i < all.length; i++) {
        if (range.intersectsNode(all[i])) {
          if (firstIdx === -1) firstIdx = i
          lastIdx = i
        }
      }
      if (firstIdx === -1) return
      const a = all[firstIdx].dataset.tk!.split("|")
      const b = all[lastIdx].dataset.tk!.split("|")
      if (a[0] !== b[0]) {
        sel.removeAllRanges()
        return
      }
      onAddHighlight({ sentenceId: a[0], tokenStart: Math.min(+a[1], +b[1]), tokenEnd: Math.max(+a[1], +b[1]) })
      sel.removeAllRanges()
    }
    const onMouseUp = () => setTimeout(handler, 10)
    document.addEventListener("mouseup", onMouseUp)
    return () => document.removeEventListener("mouseup", onMouseUp)
  }, [onAddHighlight])

  return (
    <div
      ref={containerRef}
      className="font-han select-text"
      style={{ fontSize: `${fontSizeRem}rem`, lineHeight: 1.9 }}
    >
      {sentences.map((s, si) => {
        const sentTags = s.tags ?? []
        return s.text.trim() === "" ? (
          <div key={s.id} className="h-6" />
        ) : (
          <span
            key={s.id}
            className="relative inline-block rounded-xl border-2 border-transparent transition-all"
          >
            <span
              onClick={() => onSentenceClick(s)}
              className={cn(
                "group relative mr-1 inline-block cursor-pointer rounded-xl px-1 transition-all hover:-translate-y-[2px]",
                "hover:bg-sky-400/15 hover:shadow-sm",
                focusMode && focusId && focusId !== s.id && "opacity-25 blur-[1px]",
                focusMode && focusId === s.id && "bg-amber-400/20 ring-2 ring-amber-400",
                speakingId === s.id && "animate-pulse bg-amber-400/30 shadow-lg shadow-amber-500/20 ring-2 ring-amber-400"
              )}
            >
              {s.tokens.map((t, ti) => {
                const cover = (hlBySentence.get(s.id) ?? []).find((h) => h.tokenStart <= ti && h.tokenEnd >= ti)
                const inner = isHanzi(t.ch[0]) ? (
                  <ruby key={ti} data-tk={`${s.id}|${ti}`} className="ruby">
                    {t.ch}
                    {phonetic !== "off" && (
                      <rt
                        className={cn(
                          "select-none font-sans font-normal tracking-widest text-slate-500 dark:text-slate-400",
                          phonetic === "pinyin" ? "" : "text-[0.95em]"
                        )}
                        style={{ fontSize: "0.42em" }}
                      >
                        {phonetic === "pinyin" ? t.py : "?"}
                      </rt>
                    )}
                  </ruby>
                ) : (
                  <span key={ti} data-tk={`${s.id}|${ti}`}>
                    {t.ch}
                  </span>
                )
                if (cover) {
                  return (
                    <mark
                      key={`m-${ti}`}
                      data-hid={cover.id}
                      title="點擊以刪除螢光筆"
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveHighlight(cover.id)
                      }}
                      className="cursor-pointer rounded-md transition-all hover:brightness-110"
                      style={{ backgroundColor: HIGHLIGHT_BG[cover.color as HighlightColor], padding: "0 1px" }}
                    >
                      {inner}
                    </mark>
                  )
                }
                return <span key={ti}>{inner}</span>
              })}
              <button
                className="absolute -right-2 -top-3 hidden rounded-full bg-sky-600 p-1 text-white shadow hover:bg-sky-500 group-hover:block"
                title="朗讀此句"
                onClick={(e) => {
                  e.stopPropagation()
                  speakSeq([{ id: s.id, text: s.text }], voiceLang, {})
                }}
              >
                🔊
              </button>
            </span>
            {(sentTags.length > 0 || onAddTag) && (
              <span className="ml-1 inline-flex flex-wrap items-center gap-1 align-middle">
                {sentTags.map((t) => {
                  const c = tagColorByName.get(t) ?? "violet"
                  return (
                    <button
                      key={t}
                      onClick={(e) => { e.stopPropagation(); onRemoveTag?.(si, t) }}
                      title="點擊移除標籤"
                      className={cn(
                        "inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[11px] font-bold shadow-sm transition-all hover:scale-105",
                        TAG_COLOR[c] ?? TAG_COLOR.violet
                      )}
                    >
                      {t} <X className="h-2.5 w-2.5 opacity-60" />
                    </button>
                  )
                })}
                {onAddTag && (
                  <span className="relative inline-block">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenTagFor(openTagFor === si ? null : si) }}
                      title="貼上標籤"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white/70 text-slate-500 transition-all hover:scale-110 hover:border-sky-400 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-400"
                    >
                      <Tag className="h-3 w-3" />
                    </button>
                    {openTagFor === si && onAddTag && onRemoveTag && (
                      <TagPopover
                        sentenceIndex={si}
                        currentTags={sentTags}
                        availableTags={tags}
                        onAdd={onAddTag}
                        onRemove={onRemoveTag}
                        onClose={() => setOpenTagFor(null)}
                      />
                    )}
                  </span>
                )}
              </span>
            )}
            {showExplanation && s.explanation && (
              <span className="ml-2 mr-2 inline-block translate-y-[-0.35em] rounded-xl border border-emerald-500/30 bg-emerald-50 px-3 py-1 align-middle text-xs text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-900/30 dark:text-emerald-300">
                語譯：{s.explanation}
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
