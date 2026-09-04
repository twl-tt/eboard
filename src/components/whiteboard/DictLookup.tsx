"use client"

import { useRef, useState } from "react"
import { Search, X, BookOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface LookupResult {
  word: string
  pronunciations: { jyutping: string; meaning: string }[]
}

export function DictLookup() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<LookupResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const composingRef = useRef(false)

  async function lookup(char: string) {
    if (!char) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/dict/lookup?q=${encodeURIComponent(char)}`)
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        setResult(null)
      } else {
        setResult(data)
      }
    } catch {
      setError("查詢失敗")
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    setQuery(v)
    if (composingRef.current) return
    if (v.length === 0) {
      setResult(null)
      setError("")
      return
    }
    lookup(v[v.length - 1])
  }

  function handleCompositionEnd(e: React.CompositionEvent<HTMLInputElement>) {
    composingRef.current = false
    const v = (e.target as HTMLInputElement).value
    setQuery(v)
    if (v.length > 0) lookup(v[v.length - 1])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.length > 0) {
      lookup(query[query.length - 1])
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="字典查詢"
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <BookOpen className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900/95">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">字典查詢（粵語審音配詞字庫）</h3>
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mb-4 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={handleChange}
                onCompositionStart={() => { composingRef.current = true }}
                onCompositionEnd={handleCompositionEnd}
                onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault() }}
                placeholder="輸入或貼上漢字（取最後一字查詢）"
                autoFocus
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <button
                type="submit"
                disabled={loading || !query}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 font-bold text-white disabled:opacity-50"
              >
                <Search className="h-5 w-5" />
                查詢
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400 text-center">直接貼上或輸入漢字，無需按 Enter（自動查最後一字）</p>

            {error && <p className="text-center text-red-500">{error}</p>}

            {result && (
              <div className="space-y-3">
                <div className="text-center text-5xl font-bold">{result.word}</div>
                {result.pronunciations.length > 0 ? (
                  result.pronunciations.map((p, i) => (
                    <div key={i} className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                      <div className="text-lg font-bold text-sky-600 dark:text-sky-400">粵拼：{p.jyutping}</div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{p.meaning}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-500">沒有找到發音資料</p>
                )}
              </div>
            )}

            <p className="mt-4 text-center text-xs text-slate-400">資料來源：香港中文大學人文電算研究中心</p>
          </div>
        </div>
      )}
    </>
  )
}
