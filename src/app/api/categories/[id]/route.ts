export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/api"

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.category.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
