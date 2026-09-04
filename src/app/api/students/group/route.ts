export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const schema = z.object({
  className: z.string().nullable().optional(),
  count: z.number().int().min(1).max(12),
  mode: z.enum(["random", "sequential"])
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, schema)
    const where = body.className ? { className: body.className } : {}
    const students = await db.student.findMany({ where, orderBy: [{ seatNo: "asc" }, { name: "asc" }] })
    if (students.length === 0) {
      return NextResponse.json({ error: "沒有學生" }, { status: 400 })
    }
    let order = students.slice()
    if (body.mode === "random") {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[order[i], order[j]] = [order[j], order[i]]
      }
    }
    const updates = order.map((s, i) => {
      const group = `G${(i % body.count) + 1}`
      return db.student.update({ where: { id: s.id }, data: { group } })
    })
    await db.$transaction(updates)
    return NextResponse.json({ ok: true, assigned: order.length, groups: body.count, mode: body.mode })
  } catch (e) {
    return jsonError(e)
  }
}
