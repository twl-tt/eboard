"use client"

import { useMemo } from "react"
import { Sticker as StickerIcon, X } from "lucide-react"
import type { TagDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Props {
  tags: TagDTO[]
  open: boolean
  onClose: () => void
  onDragStart: (tag: TagDTO) => void
}

const COLOR_BG: Record<string, string> = {
  violet: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)",
  rose: "linear-gradient(135deg, #fda4af 0%, #fb7185 100%)",
  amber: "linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)",
  emerald: "linear-gradient(135deg, #6ee7b7 0%, #34d399 100%)",
  sky: "linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)",
  fuchsia: "linear-gradient(135deg, #f0abfc 0%, #e879f9 100%)"
}

export function StickerBar({ tags, open, onClose, onDragStart }: Props) {
  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const t of tags) set.add(t.category)
    return Array.from(set)
  }, [tags])

  if (!open) return null

  const startDrag = (tag: TagDTO, e: React.PointerEvent) => {
    if (!e.isPrimary || e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    onDragStart(tag)
  }

  return (
    <div className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2">
      <div className="flex max-w-[92vw] flex-col gap-2 rounded-3xl border border-white/60 bg-white/90 p-3 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/90">
        <div className="flex items-center gap-2">
          <StickerIcon className="h-4 w-4 text-pink-500" />
          <span className="text-xs font-bold text-slate-500">貼紙標籤（按住拖到文章區域）</span>
          {tags.length === 0 && (
            <span className="text-[10px] text-slate-400">到「管理後台 → 標籤管理」新增標籤</span>
          )}
          <button onClick={onClose} className="ml-auto rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex max-w-[88vw] gap-3 overflow-x-auto pb-1">
          {categories.length === 0 ? (
            <p className="px-2 text-xs text-slate-400">尚未建立任何標籤分類</p>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="flex shrink-0 flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{cat}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tags.filter((t) => t.category === cat).map((t) => (
                    <button
                      key={t.id}
                      onPointerDown={(e) => startDrag(t, e)}
                      title={`${t.name}（${t.category}）— 按住拖到白板`}
                      className={cn(
                        "cursor-grab touch-none select-none rounded-2xl border border-white/40 px-2.5 py-1 text-xs font-black text-white shadow-md",
                        "transition-transform hover:scale-110 active:cursor-grabbing active:scale-105"
                      )}
                      style={{ background: COLOR_BG[t.color] ?? COLOR_BG.violet, textShadow: "0 1px 1px rgba(0,0,0,0.25)" }}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
