import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { db } from "@/lib/db"
import { splitSentences, tokenize } from "@/lib/pipeline"

const rowSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  explanation: z.string().optional()
})

function parseCSV(text: string): { title: string; content: string; explanation?: string }[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split("\t").map(h => h.trim().toLowerCase())
  const titleIdx = headers.findIndex(h => h.includes("title") || h.includes("標題"))
  const contentIdx = headers.findIndex(h => h.includes("content") || h.includes("正文") || h.includes("文本"))
  const explainIdx = headers.findIndex(h => h.includes("explanation") || h.includes("語譯") || h.includes("解釋") || h.includes("譯文"))

  if (titleIdx === -1 || contentIdx === -1) {
    return lines.slice(1).map(line => {
      const cols = line.split("\t")
      return { title: cols[titleIdx >= 0 ? titleIdx : 0]?.trim() || "", content: cols[contentIdx >= 0 ? contentIdx : 1]?.trim() || "" }
    }).filter(r => r.title && r.content)
  }

  return lines.slice(1).map(line => {
    const cols = line.split("\t")
    return {
      title: cols[titleIdx]?.trim() || "",
      content: cols[contentIdx]?.trim() || "",
      explanation: explainIdx >= 0 ? cols[explainIdx]?.trim() : undefined
    }
  }).filter(r => r.title && r.content)
}

function parseParagraphsWithExplanation(rawContent: string, explanation: string): string[] {
  const paras = rawContent.split(/\n\s*\n/).filter(p => p.trim())
  if (!explanation || paras.length === 0) return paras

  const explParas = explanation.split(/\n\s*\n/).filter(p => p.trim())
  const result: string[] = []

  for (let i = 0; i < paras.length; i++) {
    result.push(paras[i])
    if (i < explParas.length && explParas[i]) {
      result.push(`[語譯] ${explParas[i]}`)
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const categoryId = formData.get("categoryId") as string | null

    if (!file) {
      const text = await req.text()
      const rows = parseCSV(text)
      if (rows.length === 0) {
        return NextResponse.json({ error: "No valid data found. File must be TSV/CSV with title and content columns." }, { status: 400 })
      }
      return NextResponse.json({ rows: rows.length, message: `Parsed ${rows.length} rows from text. Provide categoryId to import.` })
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Missing categoryId" }, { status: 400 })
    }

    const text = await file.text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json({ error: "No valid data found" }, { status: 400 })
    }

    const category = await db.category.findUnique({ where: { id: categoryId } })
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const results: { title: string; success: boolean; error?: string }[] = []

    for (const row of rows) {
      try {
        const parsed = rowSchema.parse(row)
        const paragraphs = parsed.content.split(/\n\s*\n/).filter(p => p.trim())
        const parts = splitSentences(parsed.content)

        const sentences = parts.map((text, i) => {
          if (!text.trim()) return { id: `p${i}`, text: "", tokens: [], explanation: null }

          const paraIdx = paragraphs.findIndex(p => p.includes(text.trim()))
          let explanation: string | null = null
          if (parsed.explanation && paraIdx >= 0) {
            const explParas = parsed.explanation.split(/\n\s*\n/).filter(p => p.trim())
            if (explParas[paraIdx]) {
              explanation = explParas[paraIdx]
            }
          }

          return {
            id: `s${i}`,
            text,
            tokens: tokenize(text),
            explanation
          }
        })

        await db.article.create({
          data: {
            title: parsed.title,
            categoryId,
            rawContent: parsed.content,
            sentences: sentences as unknown as Prisma.InputJsonValue
          }
        })
        results.push({ title: parsed.title, success: true })
      } catch (e) {
        results.push({ title: row.title || "unknown", success: false, error: String(e) })
      }
    }

    return NextResponse.json({ imported: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
