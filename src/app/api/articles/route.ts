export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import { buildSentences } from "@/lib/pipeline"

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q")?.trim() ?? ""
    const articles = await db.article.findMany({
      where: q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { rawContent: { contains: q } }
            ]
          }
        : undefined,
      orderBy: { updatedAt: "desc" },
      include: { category: true }
    })
    return NextResponse.json(
      articles.map((a) => ({
        id: a.id,
        title: a.title,
        categoryId: a.categoryId,
        categoryName: a.category.name,
        grade: a.category.grade,
        updatedAt: a.updatedAt
      }))
    )
  } catch (e) {
    return jsonError(e)
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  categoryId: z.string().uuid(),
  rawContent: z.string().min(1)
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const sentences = await buildSentences(body.rawContent)
    const article = await db.article.create({
      data: {
        title: body.title,
        categoryId: body.categoryId,
        rawContent: body.rawContent,
        sentences: sentences as unknown as Prisma.InputJsonValue
      },
      include: { category: true }
    })
    return NextResponse.json(article, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}

