"use client"

import { useEffect, useRef, useState } from "react"
import type { QuizDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

function newVoterId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export default function QuizVotePage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<QuizDTO | null>(null)
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [busy, setBusy] = useState(false)
  const [retry, setRetry] = useState(0)
  const voterId = useRef("")
  const submitting = useRef(false)
  const version = useRef(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>
    version.current++
    submitting.current = false
    setBusy(false)
    setQuiz(null)
    setError("")
    try {
      const saved = localStorage.getItem("wrp-quiz-voter")
      voterId.current = saved && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved) ? saved : newVoterId()
      localStorage.setItem("wrp-quiz-voter", voterId.current)
    } catch {
      if (!voterId.current) voterId.current = newVoterId()
      setWarning("瀏覽器無法儲存作答身份，請勿關閉或重新載入此頁。")
    }
    async function load() {
      const currentVersion = version.current
      try {
        if (submitting.current) return
        const res = await fetch(`/api/classroom/quizzes/${params.id}?voterId=${encodeURIComponent(voterId.current)}`, { cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? "找不到此測驗")
        if (!cancelled && currentVersion === version.current) {
          setQuiz(data)
        }
      } catch (e) {
        if (!cancelled && currentVersion === version.current) setError(e instanceof Error ? e.message : "載入測驗失敗")
      } finally {
        if (!cancelled) timer = setTimeout(load, 3000)
      }
    }
    load()
    return () => { cancelled = true; version.current++; clearTimeout(timer) }
  }, [params.id, retry])

  async function vote(questionIndex: number, optionId: string) {
    if (!quiz?.isActive || submitting.current || quiz.answers?.[questionIndex] === optionId) return
    submitting.current = true
    const currentVersion = ++version.current
    setBusy(true)
    setError("")
    try {
      const res = await fetch(`/api/classroom/quizzes/${quiz.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, voterId: voterId.current })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "儲存答案失敗，請重試")
      if (currentVersion === version.current) setQuiz(data)
    } catch (e) {
      if (currentVersion === version.current) setError(e instanceof Error ? e.message : "儲存答案失敗，請重試")
    } finally {
      if (currentVersion === version.current) {
        submitting.current = false
        setBusy(false)
      }
    }
  }

  const indices = [...new Set(quiz?.options.map(o => o.questionIndex) ?? [])].sort((a, b) => a - b)
  const answeredCount = indices.filter(qi => quiz?.answers?.[qi]).length
  const allAnswered = indices.length > 0 && answeredCount === indices.length

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-600 to-indigo-800 p-4 font-han sm:p-8">
      <div className="mx-auto w-full max-w-2xl space-y-5 rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 dark:text-slate-100">
        <h1 className="text-center text-2xl font-bold">{quiz?.question ?? "載入測驗中…"}</h1>
        <p className="text-center text-sm">一次掃描，完成整份測驗。每題點選後自動儲存。</p>
        {warning && <p role="status" className="text-sm text-amber-600">{warning}</p>}
        {error && <div role="alert" className="rounded-xl bg-red-500/10 p-3 text-red-600 dark:text-red-300">
          <p>{error}</p>
          <button disabled={busy} className="mt-2 min-h-11 underline" onClick={() => setRetry(v => v + 1)}>重新載入</button>
        </div>}
        {quiz && <>
          <p role="status" aria-live="polite" className="text-center font-medium text-sky-600 dark:text-sky-300">
            {busy ? "儲存答案中…" : allAnswered ? `已完成全部 ${indices.length} 題` : `已答 ${answeredCount} / ${indices.length} 題`}
          </p>
          {!quiz.isActive && <p className="text-center font-bold text-amber-600">測驗已結束</p>}
          {indices.map(qi => {
            const options = quiz.options.filter(o => o.questionIndex === qi)
            const answer = quiz.answers?.[qi]
            const correct = options.find(o => o.isCorrect)
            return <fieldset key={qi} className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <legend className="px-2 text-lg font-bold">{qi + 1}. {options[0]?.questionText}</legend>
              {options.map((o, oi) => <button key={o.id} type="button" aria-pressed={answer === o.id} disabled={!quiz.isActive || busy} onClick={() => vote(qi, o.id)} className={cn(
                "block min-h-14 w-full rounded-xl border-2 px-4 py-3 text-left text-lg disabled:cursor-default",
                answer === o.id ? "border-sky-500 bg-sky-50 dark:bg-sky-950" : "border-slate-200 hover:border-sky-400 dark:border-slate-700"
              )}>{String.fromCharCode(65 + oi)}. {o.text}{answer === o.id && <span className="ml-2 text-sm text-sky-600 dark:text-sky-300">（已儲存）</span>}</button>)}
              {!quiz.isActive && correct && <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                <p>{answer ? answer === correct.id ? "答對了" : "再接再厲" : "未作答"} · 正確答案：{correct.text}</p>
                {correct.explanation && <p className="mt-1">{correct.explanation}</p>}
              </div>}
            </fieldset>
          })}
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">{quiz.isActive ? allAnswered ? "所有答案已儲存，結束前仍可更改。" : "請繼續回答其餘題目，不需再次掃碼。" : "答案已公布，不能再更改。"}</p>
        </>}
      </div>
    </main>
  )
}
