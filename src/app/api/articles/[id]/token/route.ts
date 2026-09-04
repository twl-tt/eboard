export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import type { Sentence } from "@/lib/types"

const tokenSchema = z.object({
  sentenceIndex: z.number().int().min(0),
  tokenIndex: z.number().int().min(0).optional(),
  pinyin: z.string().min(1).max(30).optional()
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, tokenSchema)
    const article = await db.article.findUniqueOrThrow({ where: { id: params.id }, select: { sentences: true } })
    const sentences = structuredClone(article.sentences) as unknown as Sentence[]
    const s = sentences[body.sentenceIndex]
    if (!s || !s.tokens?.length) return NextResponse.json({ error: "sentenceIndex invalid" }, { status: 400 })

    if (body.tokenIndex !== undefined) {
      const t = s.tokens[body.tokenIndex]
      if (!t) return NextResponse.json({ error: "tokenIndex invalid" }, { status: 400 })
      if (body.pinyin !== undefined) t.py = body.pinyin
    }

    const updated = await db.article.update({
      where: { id: params.id },
      data: { sentences: sentences as unknown as Prisma.InputJsonValue }
    })
    return NextResponse.json(updated.sentences)
  } catch (e) {
    return jsonError(e)
  }
}
