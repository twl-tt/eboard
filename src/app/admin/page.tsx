"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const AdminShell = dynamic(() => import("@/components/admin/AdminShell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <Loader2 className="mr-2 h-6 w-6 animate-spin text-sky-500" /> 載入管理後台…
    </div>
  )
})

export default function AdminPage() {
  return <AdminShell />
}
