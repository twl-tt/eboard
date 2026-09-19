import type { Prisma } from "@prisma/client"
import type { QuestionDTO } from "@/lib/types"
import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api"

export const questionInclude = {
  options: { orderBy: [{ optionIndex: "asc" }, { id: "asc" }] }
} satisfies Prisma.PollInclude

export function questionDTO(
  question: Prisma.PollGetPayload<{ include: typeof questionInclude }>,
  answers?: { questionIndex: number; optionId: string }[]
): QuestionDTO {
  return {
    id: question.id,
    question: question.question,
    isActive: question.isActive,
    questionType: question.questionType ?? null,
    correctAnswer: question.correctAnswer ?? null,
    explanation: question.explanation ?? null,
    createdAt: question.createdAt.toISOString(),
    options: question.options.map((option) => ({
      id: option.id,
      text: option.text,
      votes: option.votes,
      isCorrect: option.isCorrect,
      explanation: option.explanation ?? null
    })),
    ...(answers !== undefined ? { answers: Object.fromEntries(answers.map((answer) => [answer.questionIndex, answer.optionId])) } : {})
  }
}

export function questionError(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 })
  }
  return jsonError(error)
}