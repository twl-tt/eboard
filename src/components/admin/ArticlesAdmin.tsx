"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Search, FileUp, Pencil, Trash2, Wand2, BookText, Users, FolderTree, Upload, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Textarea, Label } from "@/components/ui/input"
import { Dialog, Select, Badge } from "@/components/ui/dialog"
import type { ArticleFull, ArticleMeta, CategoryTree, Sentence } from "@/lib/types"
import { TokenEditor } from "./TokenEditor"

export function ArticlesAdmin({ categories, refreshCategories }: { categories: CategoryTree[]; refreshCategories: () => void }) {
  const [articles, setArticles] = useState<ArticleMeta[]>([])
  const [q, setQ] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [tokenArticleId, setTokenArticleId] = useState<string | null>(null)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [bulkCategoryId, setBulkCategoryId] = useState("")
  const [bulkImporting, setBulkImporting] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ imported?: number; failed?: number; error?: string } | null>(null)

  const [title, setTitle] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [content, setContent] = useState("")
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const bulkFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    const params = q ? `?q=${encodeURIComponent(q)}` : ""
    fetch(`/api/articles${params}`).then((r) => r.json()).then(setArticles).catch(() => {})
  }, [q])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input placeholder="搜尋課文標題或內容…" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4" /> 新增課文
        </Button>
        <Button variant="secondary" onClick={() => fileRef.current?.click()}>
          <FileUp className="h-4 w-4" /> 匯入 .txt / .docx
        </Button>
        <Button variant="secondary" onClick={() => { setBulkCategoryId(categories[0]?.id ?? ""); setBulkResult(null); setShowBulkImport(true) }}>
          <Upload className="h-4 w-4" /> 批量匯入 CSV/TSV
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-2.5 font-medium">標題</th>
              <th className="px-4 py-2.5 font-medium">分類</th>
              <th className="px-4 py-2.5 font-medium">更新時間</th>
              <th className="px-4 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2.5 font-medium">{a.title}</td>
                <td className="px-4 py-2.5"><Badge>{a.grade} · {a.categoryName}</Badge></td>
                <td className="px-4 py-2.5 text-slate-400">{new Date(a.updatedAt).toLocaleString("zh-HK")}</td>
                <td className="px-4 py-2.5 text-right">
                  <Button variant="ghost" size="icon" title="多音字 / 拼音微調" onClick={() => setTokenArticleId(a.id)}>
                    <Wand2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="編輯內容" onClick={async () => {
                    const full = await fetch(`/api/articles/${a.id}`).then((r) => r.json())
                    setEditId(a.id)
                    setTitle(full.title)
                    setCategoryId(full.categoryId)
                    setContent(full.rawContent)
                    setShowForm(true)
                  }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="刪除" onClick={async () => {
                    if (!confirm(`確定刪除《${a.title}》？`)) return
                    await fetch(`/api/articles/${a.id}`, { method: "DELETE" })
                    load()
                  }}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">尚無課文，請先建立分類再新增課文。</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onClose={() => setShowForm(false)} title={editId ? "編輯課文" : "新增課文"} wide>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>標題</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：《背影》朱自清" /></div>
            <div>
              <Label>分類</Label>
              <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">選擇分類…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.grade} · {c.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label>課文內容（系統會自動切句、生成拼音）</Label>
            <Textarea className="min-h-[280px]" value={content} onChange={(e) => setContent(e.target.value)} />
          </div>
          <Button disabled={saving} onClick={save}>{saving ? "解析中…（AI 拼音）" : editId ? "儲存變更" : "建立課文"}</Button>
        </div>
      </Dialog>

      {tokenArticleId && <TokenEditor articleId={tokenArticleId} onClose={() => setTokenArticleId(null)} />}

      <Dialog open={showBulkImport} onClose={() => setShowBulkImport(false)} title="批量匯入課文">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">上傳 TSV/CSV 檔案，包含 <code>title</code>、<code>content</code>、<code>explanation</code>（可選）欄位。</p>
          <div>
            <Label>目標分類</Label>
            <Select value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)}>
              <option value="">選擇分類…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.grade} · {c.name}</option>
              ))}
            </Select>
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
              {bulkResult.error ?? `成功匯入 ${bulkResult.imported} 篇，失敗 ${bulkResult.failed} 篇`}
            </div>
          )}
          <div className="text-xs text-slate-400">
            <p>TSV/CSV 格式範例：</p>
            <pre className="mt-1 rounded bg-slate-100 p-2 dark:bg-slate-800">{`title\tcontent\texplanation\n詞三首\t"念奴嬌..."\t"長江浩浩..."`}</pre>
          </div>
        </div>
      </Dialog>
    </div>
  )

  function resetForm() {
    setEditId(null); setTitle(""); setCategoryId(categories[0]?.id ?? ""); setContent("")
  }

  async function save() {
    if (!title.trim() || !categoryId || !content.trim()) { alert("請填寫標題、分類與內容"); return }
    setSaving(true)
    try {
      const url = editId ? `/api/articles/${editId}` : "/api/articles"
      const res = await fetch(url, {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editId ? { title, categoryId, rawContent: content } : { title, categoryId, rawContent: content })
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "儲存失敗"); return }
      setShowForm(false)
      load()
      refreshCategories()
    } finally {
      setSaving(false)
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    let text = ""
    if (f.name.toLowerCase().endsWith(".docx")) {
      const fd = new FormData()
      fd.append("file", f)
      const res = await fetch("/api/import/docx", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? "匯入失敗"); return }
      text = data.text
      setTitle(title || f.name.replace(/\.docx$/i, ""))
    } else {
      text = await f.text()
      setTitle(title || f.name.replace(/\.[^.]+$/, ""))
    }
    setContent(text)
    setShowForm(true)
  }

  async function handleBulkImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    if (!bulkCategoryId) { alert("請先選擇分類"); return }
    setBulkImporting(true)
    setBulkResult(null)
    try {
      const fd = new FormData()
      fd.append("file", f)
      fd.append("categoryId", bulkCategoryId)
      const res = await fetch("/api/articles/bulk", { method: "POST", body: fd })
      const data = await res.json()
      setBulkResult(data)
      if (data.imported > 0) {
        load()
        refreshCategories()
      }
    } finally {
      setBulkImporting(false)
    }
  }
}
