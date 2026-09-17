import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { quizDTO, quizError, quizInclude } from "../quiz"

export const dynamic = "force-dynamic"

const voterSchema = z.string().uuid().transform((value) => value.toLowerCase())

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const voterId = voterSchema.optional().parse(new URL(req.url).searchParams.get("voterId") ?? undefined)
    return await db.$transaction(async (tx) => {
      const quiz = await tx.poll.findFirst({
        where: { id: params.id, isQuiz: true },
        include: quizInclude
      })
      if (!quiz) return NextResponse.json({ error: "找不到此測驗" }, { status: 404 })
      const answers = voterId === undefined ? undefined : await tx.quizAnswer.findMany({
        where: { pollId: quiz.id, voterId },
        select: { questionIndex: true, optionId: true }
      })
      return NextResponse.json(quizDTO(quiz, answers))
    }, { isolationLevel: "RepeatableRead" })
  } catch (e) {
    return quizError(e)
  }
}

const patchSchema = z.object({ isActive: z.boolean() })

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, patchSchema)
    return await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Poll" WHERE "id" = ${params.id} AND "isQuiz" = true FOR UPDATE
      `
      if (!locked.length) return NextResponse.json({ error: "找不到此測驗" }, { status: 404 })
      const quiz = await tx.poll.update({
        where: { id: params.id },
        data: { isActive: body.isActive },
        include: quizInclude
      })
      return NextResponse.json(quizDTO(quiz))
    }, { isolationLevel: "ReadCommitted" })
  } catch (e) {
    return quizError(e)
  }
}

const voteSchema = z.object({ optionId: z.string().uuid(), voterId: voterSchema })

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, voteSchema)
    return await db.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Poll" WHERE "id" = ${params.id} AND "isQuiz" = true FOR UPDATE
      `
      if (!locked.length) return NextResponse.json({ error: "找不到此測驗" }, { status: 404 })
      const quiz = await tx.poll.findUniqueOrThrow({ where: { id: params.id }, include: quizInclude })
      const option = quiz.options.find((candidate) => candidate.id === body.optionId)
      if (!option) return NextResponse.json({ error: "無效的選項" }, { status: 400 })
      const identity = { pollId: quiz.id, voterId: body.voterId, questionIndex: option.questionIndex }
      const previous = await tx.quizAnswer.findUnique({
        where: { pollId_voterId_questionIndex: identity }
      })
      if (previous?.optionId !== option.id) {
        if (!quiz.isActive) return NextResponse.json({ error: "測驗已結束" }, { status: 400 })
        if (previous) {
          await tx.quizAnswer.update({ where: { id: previous.id }, data: { optionId: option.id } })
        } else {
          await tx.quizAnswer.create({ data: { ...identity, optionId: option.id } })
        }
        const optionIds = previous ? [previous.optionId, option.id] : [option.id]
        for (const optionId of optionIds) {
          const votes = await tx.quizAnswer.count({ where: { optionId } })
          await tx.pollOption.update({ where: { id: optionId }, data: { votes } })
        }
      }
      const updated = await tx.poll.findUniqueOrThrow({ where: { id: quiz.id }, include: quizInclude })
      const answers = await tx.quizAnswer.findMany({
        where: { pollId: quiz.id, voterId: body.voterId },
        select: { questionIndex: true, optionId: true }
      })
      return NextResponse.json(quizDTO(updated, answers))
    }, { isolationLevel: "ReadCommitted" })
  } catch (e) {
    return quizError(e)
  }
}
