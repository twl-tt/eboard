"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { Select } from "@/components/ui/dialog"
import type { TagDTO } from "@/lib/types"
import { cn } from "@/lib/utils"

const COLOR_OPTIONS = [
  { value: "violet", label: "紫" },
  { value: "rose", label: "玫" },
  { value: "amber", label: "橘" },
  { value: "emerald", label: "綠" },
  { value: "sky", label: "藍" },
  { value: "fuchsia", label: "桃" }
]

const COLOR_CLASS: Record<string, string> = {
  violet: "bg-violet-500/15 text-violet-700 border-violet-500/40",
  rose: "bg-rose-500/15 text-rose-700 border-rose-500/40",
  amber: "bg-amber-500/15 text-amber-700 border-amber-500/40",
  emerald: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40",
  sky: "bg-sky-500/15 text-sky-700 border-sky-500/40",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/40"
}

const DEFAULT_CATEGORIES = ["寫作手法", "修辭手法", "結構作用"]

export function TagAdmin() {
  const [tags, setTags] = useState<TagDTO[]>([])
  const [name, setName] = useState("")
  const [category, setCategory] = useState("寫作手法")
  const [color, setColor] = useState("violet")
  const [customCategory, setCustomCategory] = useState("")

  const load = useCallback(async () => {
    const res = await fetch("/api/tags")
    if (res.ok) setTags(await res.json())
  }, [])

  useEffect(() => { load() }, [load])

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES)
    for (const t of tags) set.add(t.category)
    return Array.from(set)
  }, [tags])

  const byCategory = useMemo(() => {
    const map = new Map<string, TagDTO[]>()
    for (const t of tags) {
      const list = map.get(t.category) ?? []
      list.push(t)
      map.set(t.category, list)
    }
    return map
  }, [tags])

  async function add() {
    const n = name.trim()
    if (!n) return
    const cat = customCategory.trim() || category
    await fetch("/api/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n, category: cat, color })
    })
    setName("")
    load()
  }

  async function remove(t: TagDTO) {
    if (!confirm(`刪除「${t.name}」？`)) return
    await fetch(`/api/tags/${t.id}`, { method: "DELETE" })
    load()
  }

  async function seedDefaults() {
    const seeds: { name: string; category: string; color: string }[] = [
      { name: "比喻", category: "修辭手法", color: "violet" },
      { name: "擬人", category: "修辭手法", color: "emerald" },
      { name: "排比", category: "修辭手法", color: "sky" },
      { name: "誇張", category: "修辭手法", color: "amber" },
      { name: "反問", category: "修辭手法", color: "rose" },
      { name: "設問", category: "修辭手法", color: "fuchsia" },
      { name: "對偶", category: "修辭手法", color: "violet" },
      { name: "借代", category: "修辭手法", color: "emerald" },
      { name: "敘述", category: "寫作手法", color: "sky" },
      { name: "描寫", category: "寫作手法", color: "violet" },
      { name: "抒情", category: "寫作手法", color: "rose" },
      { name: "議論", category: "寫作手法", color: "amber" },
      { name: "說明", category: "寫作手法", color: "emerald" },
      { name: "總分總", category: "結構作用", color: "sky" },
      { name: "起承轉合", category: "結構作用", color: "violet" },
      { name: "承上啟下", category: "結構作用", color: "emerald" },
      { name: "點題", category: "結構作用", color: "amber" },
      { name: "呼應", category: "結構作用", color: "fuchsia" }
    ]
    for (const s of seeds) {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s)
      })
    }
    load()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <Label>新增標籤</Label>
          <div className="flex flex-wrap gap-2">
            <Input className="w-32" placeholder="名稱 (例: 比喻)" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={category} onChange={(e) => setCategory(e.target.value)} className="w-32">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Input className="w-32" placeholder="自訂類別" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
            <Select value={color} onChange={(e) => setColor(e.target.value)} className="w-24">
              {COLOR_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
            <Button onClick={add}><Plus className="h-4 w-4" /> 加入</Button>
          </div>
        </div>
        <Button variant="secondary" onClick={seedDefaults}>一鍵匯入預設標籤</Button>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <h3 className="mb-3 text-sm font-bold text-slate-500">{cat}</h3>
          <div className="flex flex-wrap gap-2">
            {(byCategory.get(cat) ?? []).map((t) => (
              <div key={t.id} className={cn("flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold", COLOR_CLASS[t.color] ?? COLOR_CLASS.violet)}>
                <span>{t.name}</span>
                <button onClick={() => remove(t)} className="ml-1 rounded-full p-0.5 hover:bg-black/10">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            {(!byCategory.get(cat) || byCategory.get(cat)!.length === 0) && (
              <span className="text-xs text-slate-400">尚無標籤</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
