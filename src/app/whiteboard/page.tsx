"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

const WhiteboardShell = dynamic(() => import("@/components/whiteboard/WhiteboardShell"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
      <Loader2 className="mr-2 h-8 w-8 animate-spin text-sky-500" />
      <span className="text-lg font-medium text-slate-500 dark:text-slate-400">載入電子白板…</span>
    </div>
  )
})

export default function WhiteboardPage() {
  return <WhiteboardShell />
}
