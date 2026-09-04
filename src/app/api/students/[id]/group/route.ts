export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const schema = z.object({
  group: z.string().min(1).max(20).nullable()
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, schema)
    const student = await db.student.update({ where: { id: params.id }, data: { group: body.group } })
    return NextResponse.json(student)
  } catch (e) {
    return jsonError(e)
  }
}
