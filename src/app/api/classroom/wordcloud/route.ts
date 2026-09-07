export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/api"

export async function GET() {
  try {
    const wordClouds = await db.wordCloud.findMany({
      orderBy: { createdAt: "desc" },
      include: { words: { orderBy: { count: "desc" } } }
    })
    return NextResponse.json(wordClouds)
  } catch (e) {
    return jsonError(e)
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  multiSubmit: z.boolean().optional()
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }
    const wordCloud = await db.wordCloud.create({
      data: {
        title: parsed.data.title,
        isActive: true,
        multiSubmit: parsed.data.multiSubmit ?? true
      },
      include: { words: true }
    })
    return NextResponse.json(wordCloud, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}
