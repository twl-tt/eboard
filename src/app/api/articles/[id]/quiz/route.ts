export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"
import type { GeneratedQuestion } from "@/lib/highlight"

const schema = z.object({
  count: z.number().int().min(1).max(10).default(5)
})

const VALID_QUESTION = (q: unknown): q is GeneratedQuestion =>
  !!q &&
  typeof (q as GeneratedQuestion).question === "string" &&
  Array.isArray((q as GeneratedQuestion).options) &&
  (q as GeneratedQuestion).options.length >= 2 &&
  (q as GeneratedQuestion).options.length <= 6 &&
  typeof (q as GeneratedQuestion).correctIndex === "number" &&
  (q as GeneratedQuestion).correctIndex >= 0 &&
  (q as GeneratedQuestion).correctIndex < (q as GeneratedQuestion).options.length

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { count } = await parseBody(req, schema)
    const article = await db.article.findUniqueOrThrow({ where: { id: params.id }, select: { title: true, rawContent: true } })

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        {
          error: "需要設定 OPENAI_API_KEY 才能使用 AI 測驗生成。請在 .env 加入後重啟。",
          needsKey: true,
          questions: []
        },
        { status: 200 }
      )
    }

    const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    try {
      const res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "你是經驗豐富的中文老師。請根據課文設計選擇題以評估學生對內容理解，每題 4 個選項，1 個正確答案，附簡短解析。只回覆 JSON：{\"questions\":[{question, options[4], correctIndex, explanation}]}。"
            },
            {
              role: "user",
              content: JSON.stringify({ title: article.title, content: article.rawContent.slice(0, 3500), count })
            }
          ]
        })
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        return NextResponse.json({ error: `AI 服務錯誤 (${res.status}): ${detail.slice(0, 200)}`, questions: [] }, { status: 200 })
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content
      if (!content) return NextResponse.json({ error: "AI 沒有回傳內容", questions: [] }, { status: 200 })
      const parsed = JSON.parse(content) as { questions?: unknown[] }
      const questions = (parsed.questions ?? []).filter(VALID_QUESTION) as GeneratedQuestion[]
      return NextResponse.json({ questions: questions.slice(0, count) })
    } finally {
      clearTimeout(timer)
    }
  } catch (e) {
    return jsonError(e)
  }
}
