import fs from "fs"
const path = "C:/Users/TWL/Desktop/whiteboard-reader-pro/src/components/whiteboard/WhiteboardShell.tsx"
let src = fs.readFileSync(path, "utf8")

// Find the "{mode === "read" && article && (" block and replace
const start = src.indexOf('{mode === "read" && article && (')
const endMarker = '{mode === "reorder" && article && ('
const end = src.indexOf(endMarker)
if (start === -1 || end === -1) { console.error("markers not found", start, end); process.exit(1) }

const newBlock = `{mode === "read" && article && (
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
                const COLORS = { violet: "#a78bfa", rose: "#fb7185", amber: "#fbbf24", emerald: "#34d399", sky: "#38bdf8", fuchsia: "#e879f9" }
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
                const COLORS = { violet: "#a78bfa", rose: "#fb7185", amber: "#fbbf24", emerald: "#34d399", sky: "#38bdf8", fuchsia: "#e879f9" }
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

        `

const out = src.slice(0, start) + newBlock + src.slice(end)
fs.writeFileSync(path, out)
console.log("rewrote", out.length, "bytes")
