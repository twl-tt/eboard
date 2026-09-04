"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ArticleFull, PhoneticMode, Sentence } from "@/lib/types"
import { cn, isHanzi } from "@/lib/utils"
import { speakSeq } from "@/lib/tts"
import { HIGHLIGHT_BG, type Highlight, type HighlightColor } from "@/lib/highlight"

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
  showExplanation = false
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
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
      {sentences.map((s) =>
        s.text.trim() === "" ? (
          <div key={s.id} className="h-6" />
        ) : (
          <span
            key={s.id}
            className="inline-block rounded-xl border-2 border-transparent transition-all"
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
            {showExplanation && s.explanation && (
              <span className="ml-2 mr-2 inline-block translate-y-[-0.35em] rounded-xl border border-emerald-500/30 bg-emerald-50 px-3 py-1 align-middle text-xs text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-900/30 dark:text-emerald-300">
                語譯：{s.explanation}
              </span>
            )}
          </span>
        )
      )}
    </div>
  )
}
