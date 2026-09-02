"use client"

import { useEffect, useState } from "react"
import { Sparkles, Send, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { Select } from "@/components/ui/dialog"
import type { ArticleMeta, PollDTO } from "@/lib/types"
import type { GeneratedQuestion } from "@/lib/highlight"
import { cn } from "@/lib/utils"

export function QuizPanel() {
  const [articles, setArticles] = useState<ArticleMeta[]>([])
  const [articleId, setArticleId] = useState("")
  const [count, setCount] = useState(3)
  const [generating, setGenerating] = useState(false)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [error, setError] = useState("")
  const [needsKey, setNeedsKey] = useState(false)
  const [sending, setSending] = useState<number | null>(null)
  const [sentId, setSentId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/articles")
      .then((r) => r.json())
      .then((data) => setArticles(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  async function generate() {
    if (!articleId) return
    setGenerating(true)
    setError("")
    setNeedsKey(false)
    setQuestions([])
    setSentId(null)
    try {
      const res = await fetch(`/api/articles/${articleId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count })
      })
      const data = await res.json()
      if (data?.needsKey) {
        setNeedsKey(true)
        setError(data.error ?? "需要 OpenAI API Key")
      } else if (data?.error) {
        setError(data.error)
      } else if (Array.isArray(data?.questions)) {
        setQuestions(data.questions)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGenerating(false)
    }
  }

  async function sendToPoll(qi: number) {
    const q = questions[qi]
    if (!q || !articleId) return
    setSending(qi)
    try {
      const res = await fetch("/api/classroom/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.question, options: q.options, correctIndex: q.correctIndex })
      })
      const poll: PollDTO = await res.json()
      setSentId(poll.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Select value={articleId} onChange={(e) => setArticleId(e.target.value)}>
          <option value="">選擇文章…</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.grade} · {a.categoryName} · {a.title}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min={1}
          max={5}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
          className="w-20"
        />
      </div>
      <Button onClick={generate} disabled={!articleId || generating} className="bg-gradient-to-r from-indigo-500 to-violet-600 shadow-md shadow-violet-500/30 hover:from-indigo-400 hover:to-violet-500">
        {generating ? <span className="animate-pulse">⏳ 生成中…</span> : <><Sparkles className="h-4 w-4" /> AI 生成 {count} 題測驗</>}
      </Button>

      {error && (
        <div className={cn("flex items-start gap-2 rounded-xl border p-3 text-xs", needsKey ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-200" : "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-200")}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}{needsKey && "（請至 .env 加上 OPENAI_API_KEY 後重啟服務）"}</span>
        </div>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs">已生成 {questions.length} 題，點擊「發到投票」可即時在白板投票：</Label>
          {questions.map((q, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/80">
              <p className="mb-2 text-sm font-bold">
                <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs text-white">{i + 1}</span>
                {q.question}
              </p>
              <ol className="mb-2 space-y-1 pl-7 text-xs">
                {q.options.map((o, oi) => (
                  <li key={oi} className={cn("flex items-center gap-1.5", oi === q.correctIndex && "font-bold text-emerald-600 dark:text-emerald-400")}>
                    <span className="font-mono text-slate-400">{String.fromCharCode(65 + oi)}.</span>
                    <span>{o}</span>
                    {oi === q.correctIndex && <CheckCircle2 className="h-3 w-3" />}
                  </li>
                ))}
              </ol>
              {q.explanation && <p className="mb-2 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-700 dark:text-emerald-300">💡 {q.explanation}</p>}
              <Button
                size="sm"
                variant={sentId ? "success" : "default"}
                disabled={sending !== null}
                onClick={() => sendToPoll(i)}
                className="w-full"
              >
                {sending === i ? "送出中…" : sentId ? "✓ 已送出" : <><Send className="h-3 w-3" /> 發到投票</>}
              </Button>
            </div>
          ))}
        </div>
      )}

      {questions.length === 0 && !error && !generating && (
        <p className="py-4 text-center text-xs text-slate-400">選擇課文並按下「AI 生成測驗」即會透過 OpenAI 自動設計選擇題。</p>
      )}
    </div>
  )
}
