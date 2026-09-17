import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { parseBody } from "@/lib/api"
import { quizDTO, quizError, quizInclude } from "./quiz"

export const dynamic = "force-dynamic"

const questionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  options: z.array(z.string().trim().min(1).max(1000)).min(2).max(8),
  correctIndex: z.number().int().min(0),
  explanation: z.string().max(10000).optional()
}).refine((question) => question.correctIndex < question.options.length, {
  message: "正確答案必須是有效選項",
  path: ["correctIndex"]
})

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  questions: z.array(questionSchema).min(1).max(20)
})

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const quiz = await db.poll.create({
      data: {
        question: body.title,
        isQuiz: true,
        options: {
          create: body.questions.flatMap((question, questionIndex) =>
            question.options.map((text, optionIndex) => ({
              text,
              questionIndex,
              questionText: question.question,
              optionIndex,
              isCorrect: optionIndex === question.correctIndex,
              explanation: question.explanation
            }))
          )
        }
      },
      include: quizInclude
    })
    return NextResponse.json(quizDTO(quiz), { status: 201 })
  } catch (e) {
    return quizError(e)
  }
}

export async function GET() {
  try {
    const quizzes = await db.poll.findMany({
      where: { isQuiz: true },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: quizInclude
    })
    return NextResponse.json(quizzes.map((quiz) => quizDTO(quiz)))
  } catch (e) {
    return quizError(e)
  }
}
