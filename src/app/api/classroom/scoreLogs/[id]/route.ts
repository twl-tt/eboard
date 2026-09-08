import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const log = await db.scoreLog.findUnique({ where: { id: params.id } })
    if (!log) return NextResponse.json({ error: "找不到紀錄" }, { status: 404 })

    await db.$transaction([
      db.scoreLog.delete({ where: { id: params.id } }),
      db.student.update({
        where: { id: log.studentId },
        data: { points: { increment: -log.delta } }
      })
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}