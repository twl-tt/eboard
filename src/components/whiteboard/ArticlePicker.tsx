"use client"

import { useEffect, useMemo, useState } from "react"
import type { ArticleMeta, CategoryTree } from "@/lib/types"
import { Select } from "@/components/ui/dialog"

interface Props {
  value: string | null
  onChange: (id: string, meta?: ArticleMeta) => void
  refreshKey?: number
}

export function ArticlePicker({ value, onChange, refreshKey }: Props) {
  const [tree, setTree] = useState<CategoryTree[]>([])
  const [grade, setGrade] = useState("")
  const [categoryId, setCategoryId] = useState("")

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setTree(Array.isArray(data) ? data : []))
      .catch(() => setTree([]))
  }, [refreshKey])

  const grades = useMemo(() => Array.from(new Set(tree.map((c) => c.grade))), [tree])
  const categories = useMemo(() => tree.filter((c) => !grade || c.grade === grade), [tree, grade])
  const articles = useMemo(() => (tree.find((c) => c.id === categoryId)?.articles ?? []) as { id: string; title: string }[], [tree, categoryId])

  useEffect(() => {
    if (!grade && grades.length > 0) setGrade(grades[0])
  }, [grades, grade])

  useEffect(() => {
    if (!categories.some((c) => c.id === categoryId)) setCategoryId(categories[0]?.id ?? "")
  }, [categories, categoryId])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select className="w-28" value={grade} onChange={(e) => setGrade(e.target.value)} aria-label="年級">
        <option value="">全部年級</option>
        {grades.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </Select>
      <span className="text-slate-400">➔</span>
      <Select className="w-36" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label="分類">
        <option value="">選擇分類</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <span className="text-slate-400">➔</span>
      <Select
        className="w-56"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        aria-label="課文"
      >
        <option value="">選擇課文…</option>
        {articles.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}
          </option>
        ))}
      </Select>
    </div>
  )
}
