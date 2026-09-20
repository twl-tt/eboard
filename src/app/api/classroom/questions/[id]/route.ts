import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import { questionInclude } from "../option"

export const dynamic = "force-dynamic"

const questionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  questionType: z.enum(["SINGLE", "MULTIPLE", "TRUEFALSE", "SHORTANSWER", "MATCHING"]).optional(),
  options: z.array(z.object({ text: z.string().min(1).max(1000), isCorrect: z.boolean(), explanation: z.string().max(10000).optional() })).optional(),
  explanation: z.string().max(10000).optional(),
  correctAnswer: z.string().max(1000).optional(),
  articleId: z.string().nullable().optional()
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const question = await db.poll.findFirst({ where: { id: params.id, isQuiz: false }, include: questionInclude })
    if (!question) return NextResponse.json({ error: "找不到此題目" }, { status: 404 })
    return NextResponse.json(question)
  } catch (e) {
    return jsonError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await parseBody(req, questionSchema)
    await db.poll.update({
      where: { id: params.id },
      data: {
        question: body.question,
        questionType: body.questionType,
        explanation: body.explanation,
        correctAnswer: body.correctAnswer,
        articleId: body.articleId ?? null,
        options: body.options ? {
          deleteMany: {},
          create: body.options.map((opt, optionIndex) => ({
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            explanation: opt.explanation ?? null,
            questionIndex: 0,
            optionIndex
          }))
        } : undefined
      }
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await db.poll.delete({ where: { id: params.id, isQuiz: false } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return jsonError(e)
  }
}