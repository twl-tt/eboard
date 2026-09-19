import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const poll = await db.poll.findFirst({ where: { id: params.id, isQuiz: false }, include: { options: true } })
    if (!poll) return NextResponse.json({ error: "找不到此投票" }, { status: 404 })
    return NextResponse.json(poll)
  } catch (e) {
    return jsonError(e)
  }
}

const patchSchema = z.object({ isActive: z.boolean() })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, patchSchema)
    return await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Poll" WHERE "id" = ${params.id} AND "isQuiz" = false FOR UPDATE
      `
      if (!locked.length) return NextResponse.json({ error: "找不到此投票" }, { status: 404 })
      const poll = await tx.poll.update({
        where: { id: params.id },
        data: { isActive: body.isActive },
        include: { options: true }
      })
      return NextResponse.json(poll)
    }, { isolationLevel: "ReadCommitted" })
  } catch (e) {
    return jsonError(e)
  }
}

const voteSchema = z.object({ optionId: z.string().uuid() })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, voteSchema)
    return await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Poll" WHERE "id" = ${params.id} AND "isQuiz" = false FOR UPDATE
      `
      if (!locked.length) return NextResponse.json({ error: "找不到此投票" }, { status: 404 })
      const poll = await tx.poll.findUniqueOrThrow({ where: { id: params.id } })
      if (!poll.isActive) return NextResponse.json({ error: "投票已結束" }, { status: 400 })
      const option = await tx.pollOption.findFirst({ where: { id: body.optionId, pollId: poll.id } })
      if (!option) return NextResponse.json({ error: "無效的選項" }, { status: 400 })
      await tx.pollOption.update({ where: { id: option.id }, data: { votes: { increment: 1 } } })
      const updated = await tx.poll.findUniqueOrThrow({ where: { id: poll.id }, include: { options: true } })
      return NextResponse.json(updated)
    }, { isolationLevel: "ReadCommitted" })
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await db.poll.delete({ where: { id: params.id, isQuiz: false } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}
