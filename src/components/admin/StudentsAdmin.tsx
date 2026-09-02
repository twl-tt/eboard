"use client"

import { Fragment, useCallback, useEffect, useState } from "react"
import { Plus, Trash2, FileUp, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input, Label, Textarea } from "@/components/ui/input"
import type { StudentDTO } from "@/lib/types"

export function StudentsAdmin() {
  const [students, setStudents] = useState<StudentDTO[]>([])
  const [name, setName] = useState("")
  const [seatNo, setSeatNo] = useState("")
  const [csv, setCsv] = useState("")
  const [ranked, setRanked] = useState(false)
  const [historyId, setHistoryId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch("/api/students")
    if (res.ok) setStudents(await res.json())
  }, [])

  useEffect(() => {
    load()
    window.addEventListener("points-updated", load)
    return () => window.removeEventListener("points-updated", load)
  }, [load])

  async function addStudent() {
    if (!name.trim()) return
    await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), seatNo: seatNo ? Number(seatNo) : null })
    })
    setName(""); setSeatNo("")
    load()
  }

  async function importCsv(text: string) {
    await fetch("/api/students/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv: text })
    })
    setCsv("")
    load()
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ""
    if (!f) return
    f.text().then(importCsv)
  }

  async function award(s: StudentDTO, delta: number) {
    await fetch("/api/classroom/points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: s.id, delta, reason: delta > 0 ? "後台手動加分" : "後台手動扣分" })
    })
    load()
  }

  async function remove(s: StudentDTO) {
    if (!confirm(`確定刪除學生「${s.name}」及其所有分數紀錄？`)) return
    await fetch(`/api/students/${s.id}`, { method: "DELETE" })
    if (historyId === s.id) setHistoryId(null)
    load()
  }

  async function toggleHistory(id: string) {
    if (historyId === id) {
      setHistoryId(null)
      return
    }
    const res = await fetch(`/api/students/${id}`)
    if (!res.ok) return
    const full: StudentDTO = await res.json()
    setStudents((prev) => prev.map((p) => (p.id === id ? { ...full, recentLogs: full.recentLogs ?? [] } : p)))
    setHistoryId(id)
  }

  const sorted = [...students].sort((a, b) => (ranked ? b.points - a.points : (a.seatNo ?? 9999) - (b.seatNo ?? 9999)))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <Label>新增學生</Label>
          <div className="flex gap-2">
            <Input className="w-36" placeholder="姓名" value={name} onChange={(e) => setName(e.target.value)} />
            <Input className="w-20" placeholder="座號" type="number" value={seatNo} onChange={(e) => setSeatNo(e.target.value)} />
            <Button onClick={addStudent}><Plus className="h-4 w-4" /> 加入</Button>
          </div>
        </div>
        <div className="flex min-w-[320px] flex-1 flex-col gap-1 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <Label>CSV 匯入（每行：姓名,座號）</Label>
          <Textarea className="min-h-[64px]" placeholder={"王小明,1\n陳大文,2"} value={csv} onChange={(e) => setCsv(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => importCsv(csv)} disabled={!csv.trim()}>匯入名單</Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-200 px-3 text-xs font-medium hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700">
              <FileUp className="h-3.5 w-3.5" /> 選擇 .csv 檔案
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
            </label>
          </div>
        </div>
        <Button variant={ranked ? "amber" : "secondary"} onClick={() => setRanked((v) => !v)}>
          <Trophy className="h-4 w-4" /> {ranked ? "排行榜" : "按座號"}
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-4 py-2.5 font-medium">座號</th>
              <th className="px-4 py-2.5 font-medium">姓名</th>
              <th className="px-4 py-2.5 font-medium">平時分</th>
              <th className="px-4 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <Fragment key={s.id}>
                <tr className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2">{s.seatNo ?? "-"}</td>
                  <td className="cursor-pointer px-4 py-2 font-medium hover:text-sky-500" onClick={() => toggleHistory(s.id)} title="點擊查看歷史紀錄">
                    {s.name}
                    {historyId === s.id && <span className="ml-2 text-xs text-sky-500">▲ 收起紀錄</span>}
                    {!historyId && s.recentLogs?.length ? <span className="ml-2 text-xs text-slate-400">{s.recentLogs.length} 筆近期紀錄 ▾</span> : null}
                  </td>
                  <td className="px-4 py-2"><span className={`font-mono font-bold ${ranked && i === 0 ? "text-amber-500" : ""}`}>{s.points}</span></td>
                  <td className="px-4 py-2 text-right">
                    <Button variant="success" size="sm" className="mr-1" onClick={() => award(s, 1)}>+1</Button>
                    <Button variant="destructive" size="sm" className="mr-1" onClick={() => award(s, -1)}>-1</Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(s)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </td>
                </tr>
                {historyId === s.id && (
                  <tr className="border-t border-dashed border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/60">
                    <td colSpan={4} className="px-8 py-3">
                      {(s.recentLogs?.length ?? 0) === 0 ? (
                        <p className="text-xs text-slate-400">暫無紀錄</p>
                      ) : (
                        <ul className="space-y-1 text-xs">
                          {(s.recentLogs ?? []).map((l) => (
                            <li key={l.id}>
                              <span className={l.delta > 0 ? "text-emerald-500" : "text-red-500"}>{l.delta > 0 ? `+${l.delta}` : l.delta}</span>{" "}
                              {l.reason} · <span className="text-slate-400">{new Date(l.createdAt).toLocaleString("zh-HK")}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">尚未有學生，請新增或匯入 CSV。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
