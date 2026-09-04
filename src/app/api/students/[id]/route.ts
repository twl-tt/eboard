export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const s = await db.student.findUniqueOrThrow({
      where: { id: params.id },
      include: { scoreLogs: { orderBy: { createdAt: "desc" }, take: 50 } }
    })
    return NextResponse.json({
      id: s.id,
      name: s.name,
      seatNo: s.seatNo,
      className: s.className,
      group: s.group,
      points: s.points,
      recentLogs: s.scoreLogs
    })
  } catch (e) {
    return jsonError(e)
  }
}

const patchSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  seatNo: z.number().int().min(1).max(99).nullable().optional(),
  className: z.string().min(1).max(40).nullable().optional()
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, patchSchema)
    const student = await db.student.update({ where: { id: params.id }, data: body })
    return NextResponse.json(student)
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.student.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
