export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const schema = z.object({ state: z.any().nullable() })

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const article = await db.article.findUniqueOrThrow({
      where: { id: params.id },
      select: { canvasState: true }
    })
    return NextResponse.json({ state: article.canvasState })
  } catch (e) {
    return jsonError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, schema)
    await db.article.update({
      where: { id: params.id },
      data: { canvasState: (body.state ?? Prisma.JsonNull) as never }
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
