import type { Prisma } from "@prisma/client"
import type { QuizDTO } from "@/lib/types"
import { NextResponse } from "next/server"
import { jsonError } from "@/lib/api"

export const quizInclude = {
  options: { orderBy: [{ questionIndex: "asc" }, { optionIndex: "asc" }, { id: "asc" }] }
} satisfies Prisma.PollInclude

export function quizDTO(
  quiz: Prisma.PollGetPayload<{ include: typeof quizInclude }>,
  answers?: { questionIndex: number; optionId: string }[]
): QuizDTO {
  return {
    id: quiz.id,
    question: quiz.question,
    isActive: quiz.isActive,
    options: quiz.options.map((option) => ({
      id: option.id,
      text: option.text,
      votes: option.votes,
      questionIndex: option.questionIndex,
      questionText: option.questionText ?? "",
      ...(!quiz.isActive ? { isCorrect: option.isCorrect, explanation: option.explanation } : {})
    })),
    ...(answers !== undefined ? { answers: Object.fromEntries(answers.map((answer) => [answer.questionIndex, answer.optionId])) } : {})
  }
}

export function quizError(error: unknown) {
  if (error instanceof SyntaxError) {
    return NextResponse.json({ error: "無效的 JSON" }, { status: 400 })
  }
  return jsonError(error)
}
