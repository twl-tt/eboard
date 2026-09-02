export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const schema = z.object({
  highlights: z.array(
    z.object({
      id: z.string().min(1),
      sentenceId: z.string().min(1),
      tokenStart: z.number().int().min(0),
      tokenEnd: z.number().int().min(0),
      color: z.enum(["purple", "red", "blue"]),
      createdAt: z.string().optional()
    })
  )
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const a = await db.article.findUniqueOrThrow({ where: { id: params.id }, select: { highlights: true } })
    return NextResponse.json({ highlights: a.highlights })
  } catch (e) {
    return jsonError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, schema)
    const clean = body.highlights
      .filter((h) => h.tokenEnd >= h.tokenStart)
      .map((h) => ({
        id: h.id,
        sentenceId: h.sentenceId,
        tokenStart: h.tokenStart,
        tokenEnd: h.tokenEnd,
        color: h.color,
        createdAt: h.createdAt ?? new Date().toISOString()
      }))
    await db.article.update({
      where: { id: params.id },
      data: { highlights: clean as unknown as Prisma.InputJsonValue }
    })
    return NextResponse.json({ ok: true, count: clean.length })
  } catch (e) {
    return jsonError(e)
  }
}
