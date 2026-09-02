export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export async function GET() {
  try {
    const students = await db.student.findMany({
      orderBy: [{ seatNo: "asc" }, { name: "asc" }],
      include: {
        scoreLogs: { orderBy: { createdAt: "desc" }, take: 3, select: { id: true, delta: true, reason: true, createdAt: true } }
      }
    })
    return NextResponse.json(
      students.map((s) => ({
        id: s.id,
        name: s.name,
        seatNo: s.seatNo,
        points: s.points,
        recentLogs: s.scoreLogs
      }))
    )
  } catch (e) {
    return jsonError(e)
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(30),
  seatNo: z.number().int().min(1).max(99).nullable().optional()
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const student = await db.student.create({ data: { name: body.name, seatNo: body.seatNo ?? null } })
    return NextResponse.json(student, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}
