import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({
  delta: z.number().int().min(-100).max(100),
  reason: z.string().min(1).max(100).optional()
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, schema)
    const log = await db.scoreLog.findUnique({ where: { id: params.id } })
    if (!log) return NextResponse.json({ error: "找不到紀錄" }, { status: 404 })

    const newDelta = body.delta
    const diff = newDelta - log.delta

    await db.$transaction([
      db.scoreLog.update({
        where: { id: params.id },
        data: { delta: newDelta, reason: body.reason ?? log.reason }
      }),
      db.student.update({
        where: { id: log.studentId },
        data: { points: { increment: diff } }
      })
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}