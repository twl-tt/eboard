export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError } from "@/lib/api"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const wordCloud = await db.wordCloud.findUniqueOrThrow({
      where: { id: params.id },
      include: { words: { orderBy: { count: "desc" } } }
    })
    return NextResponse.json(wordCloud)
  } catch (e) {
    return jsonError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { id } = params

    if (body.word) {
      const text = body.word.trim()
      if (!text) {
        return NextResponse.json({ error: "Word cannot be empty" }, { status: 400 })
      }
      const existing = await db.wordCloudEntry.findFirst({
        where: { wordCloudId: id, text }
      })
      if (existing) {
        await db.wordCloudEntry.update({
          where: { id: existing.id },
          data: { count: existing.count + 1 }
        })
      } else {
        await db.wordCloudEntry.create({
          data: { wordCloudId: id, text, count: 1 }
        })
      }
      const updated = await db.wordCloud.findUnique({
        where: { id },
        include: { words: { orderBy: { count: "desc" } } }
      })
      return NextResponse.json(updated)
    }

    if (body.isActive !== undefined) {
      const updated = await db.wordCloud.update({
        where: { id },
        data: { isActive: body.isActive }
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.wordCloud.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
