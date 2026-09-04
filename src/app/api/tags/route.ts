export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

const createSchema = z.object({
  name: z.string().min(1).max(30),
  category: z.string().min(1).max(30),
  color: z.string().min(1).max(20).default("violet"),
  sortOrder: z.number().int().default(0)
})

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const category = url.searchParams.get("category")
    const where = category ? { category } : {}
    const tags = await db.tag.findMany({ where, orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }] })
    return NextResponse.json(tags)
  } catch (e) {
    return jsonError(e)
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const tag = await db.tag.upsert({
      where: { name_category: { name: body.name, category: body.category } },
      update: { color: body.color, sortOrder: body.sortOrder },
      create: body
    })
    return NextResponse.json(tag, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}
