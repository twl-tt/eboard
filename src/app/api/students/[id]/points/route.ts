import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({
  points: z.number().int().min(0).max(99999)
})

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, schema)
    const student = await db.student.findUnique({ where: { id: params.id } })
    if (!student) return NextResponse.json({ error: "找不到學生" }, { status: 404 })

    const delta = body.points - student.points
    if (delta === 0) return NextResponse.json({ ok: true })

    await db.$transaction([
      db.student.update({
        where: { id: params.id },
        data: { points: body.points }
      }),
      db.scoreLog.create({
        data: { studentId: params.id, delta, reason: "後台直接設定分數" }
      })
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}