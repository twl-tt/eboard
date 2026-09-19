"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Search, Pencil, Trash2, Upload, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Textarea, Textarea as DialogTextarea, Label } from "@/components/ui/input"
import { Dialog, Select } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import type { QuestionDTO, QuestionType } from "@/lib/types"

export function QuestionsAdmin() {
  const [questions, setQuestions] = useState<QuestionDTO[]>([])
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ imported?: number; failed?: number; error?: string } | null>(null)

  const [question, setQuestion] = useState("")
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE")
  const [explanation, setExplanation] = useState("")
  const [correctAnswer, setCorrectAnswer] = useState("")
  const [options, setOptions] = useState<{ id: string; text: string; isCorrect: boolean; explanation?: string }[]>(() => {
    const arr = [{ id: "", text: "", isCorrect: true }]
    for (let i = 1; i < 4; i++) arr.push({ id: Math.random().toString(), text: "", isCorrect: false })
    return arr
  })
  const [saving, setSaving] = useState(false)

  const fileRef = useRef<HTMLInputElement>(null)
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    const params = q ? `?q=${encodeURIComponent(q)}` : ""
    fetch(`/api/classroom/questions${params}`).then((r) => r.json()).then(setQuestions).catch(() => {})
  }, [q])

  useEffect(() => {
    load()
  }, [load])

  const addOption = () => {
    setOptions([...options, { id: Math.random().toString(), text: "", isCorrect: false }])
  }

  const removeOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id))
  }

  const updateOption = (id: string, field: "text" | "isCorrect" | "explanation", value: string | boolean) => {
    setOptions(options.map(o => o.id === id ? { ...o, [field]: value } : o))
  }

  async function save() {
    if (!question.trim()) { alert("請填寫題目"); return }
    if (options.length < 2) { alert("請至少提供兩個選項"); return }
    if (questionType !== "SHORTANSWER" && options.filter(o => o.isCorrect).length === 0) { alert("請至少標記一個正確答案"); return }
    if (questionType === "SHORTANSWER" && !correctAnswer.trim()) { alert("請填寫正確答案"); return }

    setSaving(true)
    try {
      const url = editId ? `/api/classroom/questions/${editId}` : "/api/classroom/questions"
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          questionType,
          explanation: explanation.trim() || null,
          correctAnswer: questionType === "SHORTANSWER" ? correctAnswer.trim() || null : null,
          options: options.map((opt, index) => ({
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
            explanation: null
          }))
        })
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "儲存失敗"); return }
      setShowForm(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  function resetForm() {
    setEditId(null)
    setQuestion("")
    setQuestionType("SINGLE")
    setExplanation("")
    setCorrectAnswer("")
    const arr = [{ id: "", text: "", isCorrect: true }]
    for (let i = 1; i < 4; i++) arr.push({ id: Math.random().toString(), text: "", isCorrect: false })
    setOptions(arr)
  }

  async function removeQuestion(id: string) {
    if (!confirm("確定刪除此題目？")) return
    await fetch(`/api/classroom/questions/${id}`, { method: "DELETE" })
    load()
  }

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    setBulkImporting(true)
    setBulkResult(null)
    try {
      const fd = new FormData()
      fd.append("file", f)
      const res = await fetch("/api/classroom/questions", { method: "PUT", body: fd })
      const data = await res.json()
      setBulkResult(data)
      if (data.imported > 0) {
        load()
      }
    } finally {
      setBulkImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="搜尋題目內容…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> 新增題目
        </Button>
        <Button variant="secondary" onClick={() => { setBulkResult(null); setShowBulkImport(true) }}>
          <Upload className="h-4 w-4" /> 批量匯入
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            // For single file upload for questions (optional)
            if (fileRef.current) fileRef.current.value = ""
          }}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-4">
          {questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q.id} className="border rounded-xl p-4 bg-white dark:bg-slate-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold">{q.question}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        <span className="px-2 py-0.5 rounded text-xs font-medium 
                          {q.questionType === 'SINGLE' ? 'bg-blue-100 text-blue-800' 
                            : q.questionType === 'MULTIPLE' ? 'bg-green-100 text-green-800'
                            : q.questionType === 'TRUEFALSE' ? 'bg-purple-100 text-purple-800'
                            : q.questionType === 'SHORTANSWER' ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'}">
                          {q.questionType === 'SINGLE' ? '單選題' 
                            : q.questionType === 'MULTIPLE' ? '多選題'
                            : q.questionType === 'TRUEFALSE' ? '判斷題'
                            : q.questionType === 'SHORTANSWER' ? '簡答題'
                            : '配對題'}
                        </span>
                        {q.explanation && <span className="ml-2 text-xs text-slate-400">· {q.explanation}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button variant="ghost" size="icon" title="編輯" onClick={() => {
                        setEditId(q.id)
                        setQuestion(q.question)
                        setQuestionType(q.questionType ?? "SINGLE")
                        setExplanation(q.explanation ?? "")
                        setCorrectAnswer(q.correctAnswer ?? "")
                        setOptions(q.options.map(o => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })))
                        setShowForm(true)
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="刪除" onClick={() => removeQuestion(q.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, index) => (
                      <div key={opt.id} className="flex items-center space-x-3">
                        <Checkbox
                          checked={opt.isCorrect}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            // In view mode, clicking checkbox doesn't change state - this is just for display
                          }}
                          disabled
                          className="h-4 w-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{String.fromCharCode(65 + index)}. {opt.text}</p>
                          {opt.explanation && <p className="mt-1 text-xs text-slate-500">{opt.explanation}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-slate-400">尚未有題目。點擊「新增題目」開始！</p>
          )}
        </div>
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editId ? "編輯題目" : "新增題目"} wide>
        <div className="flex flex-col gap-4">
          <div>
            <Label>題目</Label>
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="請輸入題目內容" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>題型</Label>
              <Select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)}>
                <option value="SINGLE">單選題 (一個正確答案)</option>
                <option value="MULTIPLE">多選題 (多個正確答案)</option>
                <option value="TRUEFALSE">判斷題 (正確/錯誤)</option>
                <option value="SHORTANSWER">簡答題 (填空/簡答)</option>
                <option value="MATCHING">配對題</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addOption} className="mt-[28px]">
                <Plus className="h-3 w-3" /> 新增選項
              </Button>
            </div>
          </div>

          {questionType !== "SHORTANSWER" && (
            <div>
              <Label>選項</Label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={opt.id} className="flex items-start space-x-3">
                    <Checkbox
                      checked={opt.isCorrect}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(opt.id, "isCorrect", e.target.checked)}
                      className="h-4 w-4 mt-1"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <Input
                        value={opt.text}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateOption(opt.id, "text", e.target.value)}
                        placeholder={`選項 ${String.fromCharCode(65 + idx)}`}
                      />
<DialogTextarea
                        value={opt.explanation ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateOption(opt.id, "explanation", e.target.value)}
                        placeholder="選項說明（可選）"
                        className="mt-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {questionType === "SHORTANSWER" && (
            <>
              <div>
                <Label>正確答案（關鍵字）</Label>
                <Input value={correctAnswer} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCorrectAnswer(e.target.value)} placeholder="例如：朱自清" />
              </div>
              <div>
                <Label>參考解答</Label>
                <DialogTextarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="可選：提供詳細解釋" className="min-h-[80px]" />
              </div>
            </>
          )}

          {questionType !== "SHORTANSWER" && (
            <div>
              <Label>參考解答（可選）</Label>
              <DialogTextarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="可選：提供詳細解釋" className="min-h-[80px]" />
            </div>
          )}

          <Button disabled={saving} onClick={save}>
            {saving ? "儲存中…" : editId ? "儲存變更" : "建立題目"}
          </Button>
        </div>
      </Dialog>

      <Dialog open={showBulkImport} onClose={() => setShowBulkImport(false)} title="批量匯入題目">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            上傳 TSV/CSV 檔案，包含以下欄位：type, question, options, answer, explanation（可選）
          </p>
          <div className="text-sm text-slate-500">
            <p><strong>type 欄位支援：</strong>單選題/多選題/判斷題/簡答題 或 SINGLE/MULTIPLE/TRUEFALSE/SHORTANSWER</p>
            <p><strong>options 欄位：</strong>用半形逗號、全形逗號或分號分隔的選項文字</p>
            <p><strong>answer 欄位：</strong>
              <ul className="list-disc list-inside mt-1 text-xs">
                <li>單選題/判斷題：正確選項的文字（如：A）</li>
                <li>多選題：所有正確選項的文字，用逗號分隔（如：A, C）</li>
                <li>簡答題：正確答案的關鍵字</li>
                <li>配對題：待實作</li>
              </ul>
            </p>
          </div>
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 p-6 text-slate-500 transition-colors hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:hover:border-sky-500 dark:hover:bg-sky-900/20"
            onClick={() => bulkFileRef.current?.click()}
          >
            <Upload className="h-8 w-8" />
            <span className="text-sm font-medium">點擊選擇 CSV/TSV 檔案</span>
            <span className="text-xs">或拖放檔案至此區域</span>
          </div>
          <input
            ref={bulkFileRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={handleBulkImport}
          />
          {bulkResult && (
            <div className={`rounded-xl p-3 text-sm ${bulkResult.error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"}`}>
              {bulkResult.error ?? `成功匯入 ${bulkResult.imported} 題，失敗 ${bulkResult.failed} 題`}
            </div>
          )}
          <div className="text-xs text-slate-400">
            <p>TSV/CSV 格式範例：</p>
            <pre className="mt-1 rounded bg-slate-100 p-2 dark:bg-slate-800">{`type\tquestion\toptions\tanswer\texplanation\n單選題\t你最喜歡哪個角色？\tA. 朱自清\tB. 魯迅\tC. 龍應台\tD. 馬雅各\tA\t此乃經典散文\n判斷題\t朱自清是中國現代作家。\t正確\t錯誤\t正確\t這是事實\n多選題\t以下哪些是文言文特徵？\t用字雅\t句式工整\t押韻\t格式鬆散\t用字雅,句式工整,押韻\t常見特徵`}</pre>
          </div>
        </div>
      </Dialog>
    </div>
  )
}