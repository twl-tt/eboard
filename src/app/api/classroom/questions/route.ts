import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { QuestionType } from "@prisma/client"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import { questionInclude } from "./option"

export const dynamic = "force-dynamic"

const optionSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  isCorrect: z.boolean().optional(),
  explanation: z.string().max(10000).nullish()
})

const createSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  questionType: z.enum(["SINGLE", "MULTIPLE", "TRUEFALSE", "SHORTANSWER", "MATCHING"] as const),
  options: z.array(optionSchema).min(1).max(16),
  correctAnswer: z.string().max(1000).nullable().optional(),
  explanation: z.string().max(10000).nullish()
})

export async function GET() {
  try {
    const questions = await db.poll.findMany({
      where: { isQuiz: false, questionType: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: questionInclude
    })
    return NextResponse.json(questions)
  } catch (e) {
    return jsonError(e)
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseBody(req, createSchema)
    const question = await db.poll.create({
      data: {
        question: body.question,
        questionType: body.questionType as QuestionType,
        explanation: body.explanation ?? null,
        correctAnswer: body.correctAnswer ?? null,
        options: {
          create: body.options.map((opt, optionIndex) => ({
            text: opt.text,
            isCorrect: opt.isCorrect ?? false,
            explanation: opt.explanation ?? null,
            questionIndex: 0,
            optionIndex,
            questionText: body.question
          }))
        }
      },
      include: questionInclude
    })
    return NextResponse.json(question, { status: 201 })
  } catch (e) {
    return jsonError(e)
  }
}

const rowSchema = z.object({
  type: z.enum(["SINGLE", "MULTIPLE", "TRUEFALSE", "SHORTANSWER", "MATCHING"] as const),
  question: z.string().min(1).max(2000),
  options: z.array(z.string().min(1).max(1000)),
  answer: z.string().optional(),
  explanation: z.string().max(10000).nullish()
})

function parseTSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split("\t")
  return lines.slice(1).map((line) => {
    const cols = line.split("\t")
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h.trim().toLowerCase()] = cols[i]?.trim() ?? "" })
    return row
  })
}

function parseRow(row: Record<string, string>): z.infer<typeof rowSchema> | null {
  const type = row["type"] ?? row["題型"]
  const typeMap: Record<string, QuestionType> = {
    single: QuestionType.SINGLE,
    multiple: QuestionType.MULTIPLE,
    truefalse: QuestionType.TRUEFALSE,
    true_false: QuestionType.TRUEFALSE,
    tf: QuestionType.TRUEFALSE,
    shortanswer: QuestionType.SHORTANSWER,
    short: QuestionType.SHORTANSWER,
    單選題: QuestionType.SINGLE,
    多選題: QuestionType.MULTIPLE,
    判斷題: QuestionType.TRUEFALSE,
    簡答題: QuestionType.SHORTANSWER,
    配對題: QuestionType.MATCHING
  }
  const normalizedType = typeMap[(type ?? "").trim().toLowerCase() as string] ?? typeMap[type ?? ""]
  if (!normalizedType) return null

  const question = row["question"] ?? row["題目"] ?? row["題幹"]
  if (!question) return null

  let options: string[]
  const optsRaw = row["options"] ?? row["選項"] ?? row["choices"]
  if (optsRaw) {
    options = optsRaw.split(/[,，;]/).map((s) => s.trim()).filter(Boolean)
  } else {
    options = ["A", "B", "C", "D"].map((k) => row[k]).filter(Boolean)
  }
  if (options.length < 1) return null

  return {
    type: normalizedType,
    question,
    options,
    answer: row["answer"] ?? row["答案"],
    explanation: row["explanation"] ?? row["解析"]
  }
}

export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "請上傳 CSV/TSV 檔案" }, { status: 400 })
    }
    const text = await file.text()
    const rows = parseTSV(text).map(parseRow).filter(Boolean) as z.infer<typeof rowSchema>[]
    if (rows.length === 0) {
      return NextResponse.json({ error: "未解析到有效題目，請確認欄位名稱" }, { status: 400 })
    }

    let imported = 0
    let failed = 0
    const failedReasons: { question: string; error: string }[] = []

    for (const row of rows) {
      try {
        await db.$transaction(async (tx) => {
          await tx.poll.create({
            data: {
              question: row.question,
              questionType: row.type as QuestionType,
              explanation: row.explanation ?? null,
              correctAnswer: row.answer ?? null,
              options: {
                create: row.options.map((text, optionIndex) => {
                  const isCorrect = row.answer ? text.trim() === row.answer.trim() : optionIndex === 0
                  return {
                    text,
                    isCorrect: isCorrect && row.type !== "MULTIPLE",
                    questionIndex: 0,
                    optionIndex,
                    questionText: row.question
                  }
                })
              }
            },
            include: questionInclude
          })
        })
        imported++
      } catch (e) {
        failed++
        failedReasons.push({ question: row.question.slice(0, 50), error: String(e) })
      }
    }

    return NextResponse.json({ imported, failed, results: failedReasons })
  } catch (e) {
    return jsonError(e)
  }
}
