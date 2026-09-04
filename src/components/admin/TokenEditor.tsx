"use client"

import { useEffect, useState } from "react"
import { Save } from "lucide-react"
import { Dialog } from "@/components/ui/dialog"
import { Input, Label } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ArticleFull, Sentence } from "@/lib/types"
import { cn, isHanzi } from "@/lib/utils"

interface Props {
  articleId: string
  onClose: () => void
}

interface Selection {
  sentenceIndex: number
  tokenIndex: number | null
}

export function TokenEditor({ articleId, onClose }: Props) {
  const [article, setArticle] = useState<ArticleFull | null>(null)
  const [sel, setSel] = useState<Selection>({ sentenceIndex: 0, tokenIndex: 0 })
  const [py, setPy] = useState("")
  const [saving, setSaving] = useState(false)

  async function load() {
    const data: ArticleFull = await fetch(`/api/articles/${articleId}`).then((r) => r.json())
    if (data && data.id) setArticle(data)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleId])

  function selectToken(si: number, ti: number) {
    const s = article!.sentences[si]
    const t = s.tokens[ti]
    setSel({ sentenceIndex: si, tokenIndex: ti })
    setPy(t.py ?? "")
  }

  async function save() {
    if (!article || saving) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { sentenceIndex: sel.sentenceIndex }
      if (sel.tokenIndex !== null) {
        body.tokenIndex = sel.tokenIndex
        if (py.trim()) body.pinyin = py.trim()
      }
      const res = await fetch(`/api/articles/${article.id}/token`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      if (res.ok) await load()
    } finally {
      setSaving(false)
    }
  }

  const selSentence: Sentence | undefined = article?.sentences[sel.sentenceIndex]
  const selToken = selSentence && sel.tokenIndex !== null ? selSentence.tokens[sel.tokenIndex] : null

  return (
    <Dialog open onClose={onClose} title={`拼音微調 —《${article?.title ?? ""}》`} wide>
      {!article ? (
        <p className="py-10 text-center text-slate-400">載入中…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="max-h-[45vh] space-y-3 overflow-y-auto rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {article.sentences.map((s, si) =>
              s.text.trim() === "" ? (
                <div key={s.id} className="h-3" />
              ) : (
                <p key={s.id} className="text-lg leading-relaxed">
                  {s.tokens.map((t, ti) => (
                    <button
                      key={ti}
                      onClick={() => selectToken(si, ti)}
                      className={cn(
                        "relative mx-0.5 inline-flex flex-col items-center rounded-md px-1",
                        isHanzi(t.ch[0]) ? "hover:bg-sky-500/15" : "",
                        sel.sentenceIndex === si && sel.tokenIndex === ti && "bg-sky-600/25 ring-1 ring-sky-500"
                      )}
                    >
                      <span className="block w-full truncate text-center font-mono text-[10px] text-slate-400">
                        {(t.py ?? "?").slice(0, 7)}
                      </span>
                      <span>{t.ch}</span>
                    </button>
                  ))}
                </p>
              )
            )}
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            {selToken ? (
              <>
                <p className="mb-3 text-sm text-slate-500">正在編輯：<span className="text-2xl font-bold">{selToken.ch}</span></p>
                <div>
                  <Label>普通話拼音（留空保持不變）</Label>
                  <Input value={py} onChange={(e) => setPy(e.target.value)} placeholder={selToken.py ?? "例如：hao3 / hǎo"} />
                </div>
                <Button className="mt-3" onClick={save} disabled={saving}>
                  <Save className="h-4 w-4" /> 儲存校正
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-500">點擊上方漢字可編輯拼音</p>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}
