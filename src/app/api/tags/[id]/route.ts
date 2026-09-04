export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const patchSchema = z.object({
  name: z.string().min(1).max(30).optional(),
  category: z.string().min(1).max(30).optional(),
  color: z.string().min(1).max(20).optional(),
  sortOrder: z.number().int().optional()
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, patchSchema)
    const tag = await db.tag.update({ where: { id: params.id }, data: body })
    return NextResponse.json(tag)
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.tag.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
