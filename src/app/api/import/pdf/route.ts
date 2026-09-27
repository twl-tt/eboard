import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择文件" }, { status: 400 })
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "请上传 .pdf 文件" }, { status: 400 })
    }

    // Ensure DOMMatrix exists for pdfjs-dist (used by pdf-parse)
    if (typeof globalThis.DOMMatrix === 'undefined') {
      globalThis.DOMMatrix = require('dommatrix')
    }

    const pdfParseModule = await import("pdf-parse")
    const pdfParse: any = pdfParseModule
    const buffer = Buffer.from(await file.arrayBuffer())
    const data = await pdfParse(buffer)

    return NextResponse.json({
      pages: data.pageCount,
      text: data.text,
      info: data.info
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "服务器内部错误" }, { status: 500 })
  }
}