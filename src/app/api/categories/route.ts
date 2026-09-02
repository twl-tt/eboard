export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ grade: "asc" }, { name: "asc" }],
      include: { articles: { orderBy: { createdAt: "desc" }, select: { id: true, title: true } } }
    })
    return NextResponse.json(categories)
  } catch (e) {
    return jsonError(e)
  }
}

const createSchema = z.object({
  name: z.string().min(1).max(50),
  grade: z.string().min(1).max(20)
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const category = await db.category.upsert({
      where: { name_grade: { name: body.name, grade: body.grade } },
      update: {},
      create: body
    })
    return NextResponse.json(category, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}
