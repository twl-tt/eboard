import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const poll = await db.poll.findUniqueOrThrow({ where: { id: params.id }, include: { options: true } })
    return NextResponse.json(poll)
  } catch (e) {
    return jsonError(e)
  }
}

const patchSchema = z.object({ isActive: z.boolean() })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, patchSchema)
    const poll = await db.poll.update({
      where: { id: params.id },
      data: { isActive: body.isActive },
      include: { options: true }
    })
    return NextResponse.json(poll)
  } catch (e) {
    return jsonError(e)
  }
}

const voteSchema = z.object({ optionId: z.string().uuid() })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, voteSchema)
    const option = await db.pollOption.findFirstOrThrow({
      where: { id: body.optionId, pollId: params.id }
    })
    const poll = await db.poll.findUniqueOrThrow({ where: { id: params.id } })
    if (!poll.isActive) return NextResponse.json({ error: "投票已結束" }, { status: 400 })
    const [updated] = await db.$transaction([
      db.pollOption.update({ where: { id: option.id }, data: { votes: { increment: 1 } } }),
      db.poll.findUnique({ where: { id: params.id }, include: { options: true } })
    ])
    return NextResponse.json(updated)
  } catch (e) {
    return jsonError(e)
  }
}
