"use client"

import { useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import type { GeneratedQuestion } from "@/lib/highlight"
import { cn } from "@/lib/utils"

export function QuizScreen({ questions, onClose }: { questions: GeneratedQuestion[]; onClose: () => void }) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  const [selections, setSelections] = useState<Record<number, number>>({})
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({})
  const [complete, setComplete] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  const questionId = useId()
  const feedbackId = useId()
  closeRef.current = onClose

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const host = document.createElement("div")
    const siblings = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement)
    const previousInert = siblings.map(element => element.inert)
    const previousOverflow = document.body.style.overflow
    siblings.forEach(element => { element.inert = true })
    document.body.style.overflow = "hidden"
    document.body.appendChild(host)
    setPortal(host)
    return () => {
      host.remove()
      siblings.forEach((element, i) => { element.inert = previousInert[i] })
      document.body.style.overflow = previousOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    if (!portal) return
    dialogRef.current?.focus({ preventScroll: true })
    const handleKeyDown = (event: KeyboardEvent) => {
      const dialog = dialogRef.current
      if (!dialog) return
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopImmediatePropagation()
        closeRef.current()
        return
      }
      if (event.key !== "Tab") return
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"))
        .filter(element => element.tabIndex >= 0 && element.getClientRects().length > 0)
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (!first) {
        event.preventDefault()
        dialog.focus()
      } else if (event.shiftKey && (document.activeElement === first || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !controls.includes(document.activeElement as HTMLElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    const handleFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialogRef.current?.contains(event.target)) dialogRef.current?.focus({ preventScroll: true })
    }
    document.addEventListener("keydown", handleKeyDown, true)
    document.addEventListener("focusin", handleFocus)
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("focusin", handleFocus)
    }
  }, [portal])

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    dialogRef.current?.scrollTo({ top: 0 })
  }, [index, complete])

  const question = questions[index]
  const selected = selections[index]
  const revealed = confirmed[index] === true
  const answered = questions.filter((_, i) => confirmed[i]).length
  const score = questions.filter((q, i) => confirmed[i] && selections[i] === q.correctIndex).length
  const buttonClass = "min-h-14 touch-manipulation rounded-2xl border-2 border-slate-300 px-5 py-3 text-lg font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600"

  function restart() {
    setIndex(0)
    setSelections({})
    setConfirmed({})
    setComplete(false)
    headingRef.current?.focus({ preventScroll: true })
    dialogRef.current?.scrollTo({ top: 0 })
  }

  if (!portal) return null

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-[10000] overflow-y-auto overscroll-contain bg-slate-50 text-slate-950 outline-none dark:bg-slate-950 dark:text-slate-50"
      onKeyDown={event => event.stopPropagation()}
      onClick={event => event.stopPropagation()}
      onPointerDown={event => event.stopPropagation()}
    >
      <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 id={titleId} className="text-2xl font-bold sm:text-3xl">課堂測驗</h1>
          <div className="flex flex-wrap gap-3">
            {questions.length > 0 && <button type="button" className={buttonClass} onClick={restart}>重新開始</button>}
            <button type="button" className={buttonClass} onClick={onClose} aria-label="關閉測驗">關閉</button>
          </div>
        </header>

        {questions.length === 0 ? (
          <h2 ref={headingRef} tabIndex={-1} className="my-auto py-12 text-center text-3xl font-bold outline-none">尚未有測驗題目</h2>
        ) : complete ? (
          <section className="my-auto space-y-6 py-12 text-center">
            <h2 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none sm:text-5xl">測驗完成</h2>
            <p className="text-5xl font-bold text-sky-700 dark:text-sky-300 sm:text-7xl">{score} / {questions.length}</p>
            <p className="text-xl">答對 {score} 題，共 {questions.length} 題（{Math.round(score / questions.length * 100)}%）</p>
            <button type="button" className={buttonClass} onClick={() => { setIndex(0); setComplete(false) }}>檢視答案</button>
          </section>
        ) : question ? (
          <>
            <section className="flex-1 space-y-6" aria-labelledby={questionId}>
              <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">第 {index + 1} / {questions.length} 題 · 已確認 {answered} 題</p>
              <h2 id={questionId} ref={headingRef} tabIndex={-1} className="break-words text-2xl font-bold leading-relaxed outline-none sm:text-4xl">{question.question}</h2>
              <div className="grid gap-4 sm:grid-cols-2" role="group" aria-label="選擇答案">
                {question.options.map((option, optionIndex) => (
                  <button
                    key={optionIndex}
                    type="button"
                    aria-pressed={selected === optionIndex}
                    aria-disabled={revealed}
                    onClick={() => { if (!revealed) setSelections(previous => ({ ...previous, [index]: optionIndex })) }}
                    className={cn(
                      "flex min-h-24 touch-manipulation items-center gap-4 rounded-2xl border-2 p-5 text-left text-xl font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-sky-500 sm:min-h-32 sm:p-6 sm:text-2xl",
                      selected === optionIndex ? "border-sky-600 bg-sky-100 dark:border-sky-400 dark:bg-sky-950" : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900",
                      !revealed && "hover:border-sky-500",
                      revealed && optionIndex === question.correctIndex && "border-emerald-600 bg-emerald-100 dark:border-emerald-400 dark:bg-emerald-950",
                      revealed && selected === optionIndex && optionIndex !== question.correctIndex && "border-red-600 bg-red-100 dark:border-red-400 dark:bg-red-950"
                    )}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-current" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="min-w-0 break-words">{option}{revealed && optionIndex === question.correctIndex && <span className="mt-2 block text-base">正確答案</span>}{revealed && selected === optionIndex && optionIndex !== question.correctIndex && <span className="mt-2 block text-base">你的答案</span>}</span>
                  </button>
                ))}
              </div>
              <div id={feedbackId} role="status" aria-live="polite" aria-atomic="true">
                {revealed && (
                  <div className="space-y-3 rounded-2xl bg-white p-5 text-xl dark:bg-slate-900">
                    <p className="font-bold">{selected === question.correctIndex ? "答對了！" : "答錯了。"} 正確答案：{String.fromCharCode(65 + question.correctIndex)}. {question.options[question.correctIndex]}</p>
                    {question.explanation && <p className="whitespace-pre-wrap break-words leading-relaxed">{question.explanation}</p>}
                  </div>
                )}
              </div>
              {!revealed && <button type="button" disabled={selected === undefined} onClick={() => setConfirmed(previous => ({ ...previous, [index]: true }))} className={cn(buttonClass, "w-full border-sky-700 bg-sky-700 text-white sm:w-auto")}>確認答案</button>}
            </section>
            <nav className="flex flex-wrap justify-between gap-3 border-t border-slate-300 pt-5 dark:border-slate-700" aria-label="測驗題目導覽">
              <button type="button" disabled={index === 0} className={buttonClass} onClick={() => setIndex(previous => previous - 1)}>上一題</button>
              {index < questions.length - 1 && <button type="button" className={buttonClass} onClick={() => setIndex(previous => previous + 1)}>下一題</button>}
              {index === questions.length - 1 && answered < questions.length && <button type="button" className={buttonClass} onClick={() => setIndex(questions.findIndex((_, i) => !confirmed[i]))}>前往未作答題目</button>}
              {answered === questions.length && <button type="button" className={cn(buttonClass, "border-sky-700 bg-sky-700 text-white")} onClick={() => setComplete(true)}>完成測驗</button>}
            </nav>
          </>
        ) : null}
      </div>
    </div>,
    portal
  )
}
