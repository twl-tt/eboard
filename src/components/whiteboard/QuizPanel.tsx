"use client"

import { useEffect, useRef, useState } from "react"
import { QRCodeSVG } from "qrcode.react"
import { Sparkles, Monitor, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/dialog"
import type { ArticleMeta, QuizDTO } from "@/lib/types"
import type { GeneratedQuestion } from "@/lib/highlight"
import { QuizScreen } from "./QuizScreen"

function isQuestion(value: unknown): value is GeneratedQuestion {
  if (!value || typeof value !== "object") return false
  const q = value as GeneratedQuestion
  return typeof q.question === "string" && q.question.trim().length > 0 &&
    Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 8 &&
    q.options.every(o => typeof o === "string" && o.trim().length > 0) &&
    Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length &&
    typeof q.explanation === "string"
}

export function QuizPanel() {
  const [articles, setArticles] = useState<ArticleMeta[]>([])
  const [articleId, setArticleId] = useState("")
  const [count, setCount] = useState(3)
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([])
  const [title, setTitle] = useState("測驗")
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [closing, setClosing] = useState(false)
  const [screenOpen, setScreenOpen] = useState(false)
  const [error, setError] = useState("")
  const [quizzes, setQuizzes] = useState<QuizDTO[]>([])
  const [quiz, setQuiz] = useState<QuizDTO | null>(null)
  const [origin, setOrigin] = useState("")
  const [draftLoaded, setDraftLoaded] = useState(false)
  const requestVersion = useRef(0)
  const actionLock = useRef(false)

  useEffect(() => {
    let cancelled = false
    setOrigin(window.location.origin)
    try {
      const draft = JSON.parse(sessionStorage.getItem("wrp-quiz-draft") ?? "null")
      if (draft && Array.isArray(draft.questions) && draft.questions.length > 0 && draft.questions.length <= 20 && draft.questions.every(isQuestion)) {
        setQuestions(draft.questions)
        setTitle(typeof draft.title === "string" ? draft.title : "測驗")
      }
    } catch {}
    setDraftLoaded(true)
    fetch("/api/articles").then(r => r.json()).then(data => {
      if (!cancelled) setArticles(Array.isArray(data) ? data : [])
    }).catch(() => {})
    fetch("/api/classroom/quizzes").then(async r => {
      const data = await r.json()
      if (!r.ok) throw new Error(data.error ?? "載入測驗失敗")
      if (!cancelled) {
        setQuizzes(data)
        setQuiz(data[0] ?? null)
      }
    }).catch(e => { if (!cancelled) setError(e.message) })
    return () => { cancelled = true; requestVersion.current++ }
  }, [])

  useEffect(() => {
    if (!draftLoaded) return
    try { sessionStorage.setItem("wrp-quiz-draft", JSON.stringify({ title, questions })) } catch {}
  }, [draftLoaded, title, questions])

  useEffect(() => {
    if (!quiz?.id || !quiz.isActive) return
    const id = quiz.id
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    async function refresh() {
      const version = requestVersion.current
      try {
        const res = await fetch(`/api/classroom/quizzes/${id}`, { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "更新結果失敗")
        if (!cancelled && version === requestVersion.current) {
          setQuiz(prev => prev?.id === id ? data : prev)
          setQuizzes(prev => prev.map(q => q.id === id ? data : q))
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "更新結果失敗")
      } finally {
        if (!cancelled) timer = setTimeout(refresh, 3000)
      }
    }
    timer = setTimeout(refresh, 3000)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [quiz?.id, quiz?.isActive])

  async function generate() {
    if (!articleId || actionLock.current) return
    actionLock.current = true
    setGenerating(true)
    setError("")
    const selectedTitle = articles.find(a => a.id === articleId)?.title ?? "測驗"
    try {
      const res = await fetch(`/api/articles/${articleId}/quiz`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? "生成測驗失敗")
      if (!Array.isArray(data.questions) || data.questions.length === 0) throw new Error("未生成有效題目，請重試")
      setQuestions(data.questions)
      setTitle(selectedTitle)
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成測驗失敗")
    } finally {
      actionLock.current = false
      setGenerating(false)
    }
  }

  async function publish() {
    if (!questions.length || actionLock.current) return
    actionLock.current = true
    setSending(true)
    setError("")
    try {
      const res = await fetch("/api/classroom/quizzes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, questions })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "發佈測驗失敗")
      requestVersion.current++
      setQuiz(data)
      setQuizzes(prev => [data, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : "發佈測驗失敗")
    } finally {
      actionLock.current = false
      setSending(false)
    }
  }

  async function closeQuiz() {
    if (!quiz || actionLock.current) return
    actionLock.current = true
    requestVersion.current++
    setClosing(true)
    setError("")
    try {
      const res = await fetch(`/api/classroom/quizzes/${quiz.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: false })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "結束測驗失敗")
      requestVersion.current++
      setQuiz(data)
      setQuizzes(prev => prev.map(q => q.id === data.id ? data : q))
    } catch (e) {
      setError(e instanceof Error ? e.message : "結束測驗失敗")
    } finally {
      actionLock.current = false
      setClosing(false)
    }
  }

  const questionIndices = [...new Set(quiz?.options.map(o => o.questionIndex) ?? [])].sort((a, b) => a - b)
  const url = quiz && origin ? `${origin}/quiz/${quiz.id}` : ""

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Select aria-label="選擇文章" value={articleId} disabled={generating || sending} onChange={e => setArticleId(e.target.value)}>
          <option value="">選擇文章…</option>
          {articles.map(a => <option key={a.id} value={a.id}>{a.grade} · {a.title}</option>)}
        </Select>
        <Input aria-label="題目數量" type="number" min={1} max={10} value={count} disabled={generating || sending} onChange={e => setCount(Math.max(1, Math.min(10, Math.floor(Number(e.target.value) || 1))))} className="w-20" />
      </div>
      <Button onClick={generate} disabled={!articleId || generating || sending}>
        <Sparkles className="h-4 w-4" />{generating ? "生成中…" : `AI 生成 ${count} 題測驗`}
      </Button>
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">{error}</p>}
      {questions.length > 0 && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <p className="font-bold">{title} · {questions.length} 題</p>
          <Button className="w-full" disabled={generating || sending} onClick={() => setScreenOpen(true)}><Monitor className="h-4 w-4" />直接在螢幕作答</Button>
          <Button className="w-full" disabled={generating || sending} onClick={publish}><Send className="h-4 w-4" />{sending ? "發佈中…" : "發佈整份測驗（一個 QR Code）"}</Button>
          <details>
            <summary className="cursor-pointer text-sm">老師預覽題目及答案</summary>
            {questions.map((q, i) => <div key={i} className="mt-3 space-y-1 text-sm">
              <p className="font-bold">{i + 1}. {q.question}</p>
              {q.options.map((o, oi) => <p key={oi}>{String.fromCharCode(65 + oi)}. {o}</p>)}
              <p className="text-emerald-600 dark:text-emerald-300">正解：{String.fromCharCode(65 + q.correctIndex)} · {q.explanation}</p>
            </div>)}
          </details>
        </div>
      )}
      {quizzes.length > 0 && <Select aria-label="已發佈測驗" value={quiz?.id ?? ""} disabled={closing || sending} onChange={e => { requestVersion.current++; setQuiz(quizzes.find(q => q.id === e.target.value) ?? null); setError("") }}>
        {quizzes.map(q => <option key={q.id} value={q.id}>{q.isActive ? "進行中" : "已結束"} · {q.question}</option>)}
      </Select>}
      {quiz && <div className="space-y-3">
        <h4 className="font-bold">{quiz.question}</h4>
        {url && <>
          <div className="mx-auto w-fit rounded-xl bg-white p-3"><QRCodeSVG value={url} size={180} /></div>
          <a className="block break-all text-center text-sm text-sky-600 underline" href={url} target="_blank" rel="noreferrer">開啟學生作答頁</a>
          <p className="text-center text-xs">只需掃描一次，即可回答全部 {questionIndices.length} 題。</p>
        </>}
        {questionIndices.map(qi => {
          const options = quiz.options.filter(o => o.questionIndex === qi)
          const total = options.reduce((sum, o) => sum + o.votes, 0)
          return <div key={qi} className="space-y-2 rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
            <p className="text-sm font-bold">{qi + 1}. {options[0]?.questionText}</p>
            <p className="text-xs">已答：{total} 人</p>
            {options.map(o => <div key={o.id} className="text-xs">
              <div className="flex justify-between gap-2"><span>{o.text}{!quiz.isActive && o.isCorrect ? "（正解）" : ""}</span><span className="shrink-0">{o.votes} 票</span></div>
              <div className="mt-1 h-2 overflow-hidden rounded bg-slate-200 dark:bg-slate-700"><div className="h-full bg-sky-500" style={{ width: `${total ? o.votes / total * 100 : 0}%` }} /></div>
            </div>)}
          </div>
        })}
        {quiz.isActive ? <Button variant="destructive" disabled={closing || sending} onClick={closeQuiz}>{closing ? "結束中…" : "結束測驗並公布答案"}</Button> : <p className="text-sm">測驗已結束，學生可查看答案。</p>}
      </div>}
      {screenOpen && <QuizScreen questions={questions} onClose={() => setScreenOpen(false)} />}
    </div>
  )
}
