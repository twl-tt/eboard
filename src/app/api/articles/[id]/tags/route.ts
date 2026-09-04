export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import type { Sentence } from "@/lib/types"

const schema = z.object({
  sentenceIndex: z.number().int().min(0),
  tags: z.array(z.string().min(1).max(50)).max(20)
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, schema)
    const article = await db.article.findUniqueOrThrow({ where: { id: params.id }, select: { sentences: true } })
    const sentences = structuredClone(article.sentences) as unknown as Sentence[]
    const s = sentences[body.sentenceIndex]
    if (!s) return NextResponse.json({ error: "sentenceIndex invalid" }, { status: 400 })
    s.tags = [...new Set(body.tags)]
    const updated = await db.article.update({
      where: { id: params.id },
      data: { sentences: sentences as unknown as Prisma.InputJsonValue }
    })
    return NextResponse.json(updated.sentences)
  } catch (e) {
    return jsonError(e)
  }
}
