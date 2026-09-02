import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const polls = await db.poll.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { options: true }
    })
    return NextResponse.json(polls)
  } catch (e) {
    return jsonError(e)
  }
}

const createSchema = z.object({
  question: z.string().min(1).max(200),
  options: z.array(z.string().min(1).max(100)).min(2).max(8),
  correctIndex: z.number().int().min(0).max(7).nullable().optional()
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const poll = await db.poll.create({
      data: {
        question: body.question,
        correctIndex: body.correctIndex ?? null,
        options: { create: body.options.map((text) => ({ text })) }
      },
      include: { options: true }
    })
    return NextResponse.json(poll, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}
