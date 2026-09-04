import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { jsonError, parseBody } from "@/lib/api"

export const dynamic = "force-dynamic"

const schema = z.object({ csv: z.string().min(1).max(200000) })

export async function POST(req: Request) {
  try {
    const { csv } = await parseBody(req, schema)
    const rows = csv
      .split(/\r?\n/)
      .map((line) => line.split(/[,，\t]/).map((c) => c.trim()))
      .filter((cells) => cells[0] && cells[0] !== "姓名" && cells[0] !== "name")
    if (rows.length === 0) return NextResponse.json({ error: "CSV 內容為空或格式錯誤（每行：姓名,座號,班別）" }, { status: 400 })

    const data = rows.slice(0, 500).map((cells) => ({
      name: cells[0].slice(0, 30),
      seatNo: cells[1] && /^\d+$/.test(cells[1]) ? Number(cells[1]) : null,
      className: cells[2] ? cells[2].slice(0, 40) : null
    }))
    const result = await db.student.createMany({ data, skipDuplicates: true })
    return NextResponse.json({ imported: result.count })
  } catch (e) {
    return jsonError(e)
  }
}
