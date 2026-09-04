"use client"

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { BookText, Users, FolderTree, ArrowLeft, Plus, Trash2, Tags } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import type { CategoryTree } from "@/lib/types"
import { ArticlesAdmin } from "./ArticlesAdmin"
import { StudentsAdmin } from "./StudentsAdmin"
import { TagAdmin } from "./TagAdmin"

type Tab = "articles" | "students" | "categories" | "tags"

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "articles", label: "課文管理", icon: <BookText className="h-4 w-4" /> },
  { key: "categories", label: "分類管理", icon: <FolderTree className="h-4 w-4" /> },
  { key: "students", label: "學生管理", icon: <Users className="h-4 w-4" /> },
  { key: "tags", label: "標籤管理", icon: <Tags className="h-4 w-4" /> }
]

export default function AdminShell() {
  const [tab, setTab] = useState<Tab>("articles")
  const [categories, setCategories] = useState<CategoryTree[]>([])
  const [newName, setNewName] = useState("")
  const [newGrade, setNewGrade] = useState("全校")

  const load = useCallback(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function addCategory() {
    if (!newName.trim()) return
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), grade: newGrade.trim() || "全校" })
    })
    setNewName("")
    load()
  }

  async function removeCategory(id: string) {
    if (!confirm("刪除分類會連同其課文一併刪除，確定？")) return
    await fetch(`/api/categories/${id}`, { method: "DELETE" })
    load()
  }

  return (
    <div className="relative min-h-screen bg-[#eef2f7] text-slate-900 dark:bg-[#0a0f1e] dark:text-slate-100">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl dark:bg-violet-600/10" />
        <div className="dot-grid absolute inset-0 opacity-60 dark:opacity-30" />
      </div>
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col gap-4 p-6">
      <header className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 text-xl shadow-lg shadow-fuchsia-500/30">⚙️</span>
        <div className="leading-tight">
          <h1 className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-xl font-black tracking-tight text-transparent dark:from-violet-400 dark:via-fuchsia-400 dark:to-pink-400">
            管理後台
          </h1>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">eBoard CMS</p>
        </div>
        <nav className="flex gap-1 rounded-2xl border border-white/50 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/60">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative rounded-xl px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === t.key ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              {tab === t.key && (
                <motion.span layoutId="adminTabPill" className="absolute inset-0 rounded-xl bg-white shadow-md dark:bg-slate-700" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              <span className="relative z-10 flex items-center gap-1.5">{t.icon} {t.label}</span>
            </button>
          ))}
        </nav>
        <Link href="/whiteboard" className="ml-auto flex items-center gap-1 rounded-full bg-sky-500/10 px-3.5 py-1.5 text-sm font-semibold text-sky-600 transition-colors hover:bg-sky-500/20 dark:text-sky-300">
          <ArrowLeft className="h-4 w-4" /> 返回電子白板
        </Link>
      </header>

      {tab === "articles" && <ArticlesAdmin categories={categories} refreshCategories={load} />}
      {tab === "students" && <StudentsAdmin />}
      {tab === "tags" && <TagAdmin />}
      {tab === "categories" && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex flex-col gap-1">
              <Label>年級</Label>
              <Input className="w-28" value={newGrade} onChange={(e) => setNewGrade(e.target.value)} placeholder="例如：中一 / 全校" />
            </div>
            <div className="flex flex-col gap-1">
              <Label>分類名稱</Label>
              <Input className="w-56" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例如：記敘文 / 古詩詞" />
            </div>
            <Button onClick={addCategory}><Plus className="h-4 w-4" /> 建立分類</Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div key={c.id} className="flex items-start justify-between rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{c.grade} · {c.articles.length} 篇課文</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{c.articles.map((a) => a.title).join("、") || "—"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => removeCategory(c.id)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
            {categories.length === 0 && <p className="py-10 text-center text-slate-400 sm:col-span-2 lg:col-span-3">尚未有分類。</p>}
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
