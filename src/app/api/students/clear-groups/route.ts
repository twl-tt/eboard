export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const schema = z.object({
  className: z.string().nullable().optional()
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, schema)
    const where = body.className ? { className: body.className } : {}
    await db.student.updateMany({ where, data: { group: null } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
