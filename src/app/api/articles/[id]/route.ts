export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import { buildSentences, extractOverrides, applyOverrides } from "@/lib/pipeline"

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  categoryId: z.string().uuid().optional(),
  rawContent: z.string().min(1).optional(),
  reparse: z.boolean().optional()
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const article = await db.article.findUniqueOrThrow({ where: { id: params.id }, include: { category: true } })
    return NextResponse.json({
      id: article.id,
      title: article.title,
      rawContent: article.rawContent,
      categoryId: article.categoryId,
      categoryName: article.category.name,
      grade: article.category.grade,
      sentences: article.sentences,
      canvasState: article.canvasState,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    })
  } catch (e) {
    return jsonError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, patchSchema)
    const old = await db.article.findUniqueOrThrow({ where: { id: params.id }, select: { sentences: true } })

    const data: Prisma.ArticleUpdateInput = {}
    if (body.title !== undefined) data.title = body.title
    if (body.categoryId !== undefined) data.category = { connect: { id: body.categoryId } }

    if (body.rawContent !== undefined && body.reparse !== false) {
      const newSentences = await buildSentences(body.rawContent)
      applyOverrides(newSentences, extractOverrides(old.sentences as unknown as never))
      data.rawContent = body.rawContent
      data.sentences = newSentences as unknown as Prisma.InputJsonValue
    } else if (body.rawContent !== undefined) {
      data.rawContent = body.rawContent
    }

    const article = await db.article.update({ where: { id: params.id }, data })
    return NextResponse.json(article)
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.article.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
