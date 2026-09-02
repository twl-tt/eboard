import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({
  studentId: z.string().uuid(),
  delta: z.number().int().refine((v) => v !== 0 && Math.abs(v) <= 100, { message: "delta 必須為非零且 ≤100" }),
  reason: z.string().min(1).max(100)
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, schema)
    const [student] = await db.$transaction([
      db.student.update({
        where: { id: body.studentId },
        data: { points: { increment: body.delta } },
        include: { scoreLogs: { orderBy: { createdAt: "desc" }, take: 3 } }
      }),
      db.scoreLog.create({
        data: { studentId: body.studentId, delta: body.delta, reason: body.reason }
      })
    ])
    return NextResponse.json(student)
  } catch (e) {
    return jsonError(e)
  }
}
