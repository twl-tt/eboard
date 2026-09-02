import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "蝻箏?瑼?" }, { status: 400 })
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json({ error: "???.docx 瑼?" }, { status: 400 })
    }
    const mammoth = await import("mammoth")
    const buffer = Buffer.from(await file.arrayBuffer())
    const { value } = await mammoth.extractRawText({ buffer })
    return NextResponse.json({ text: value })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
