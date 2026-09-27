import { NextResponse } from "next/server"

export const runtime = "nodejs"

globalThis.DOMMatrix = class DOMMatrix {
  a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
  constructor(init?: string | number[]) {}
  static fromMatrix(other?: DOMMatrix) { return new DOMMatrix() }
  multiplySelf(other: DOMMatrix) { return this }
  inverse() { return new DOMMatrix() }
  translateSelf(x: number, y: number, z?: number) { return this }
  scaleSelf(sx: number, sy?: number, sz?: number) { return this }
  rotateSelf(angle: number, rx?: number, ry?: number, rz?: number) { return this }
  toFloat32Array() { return new Float32Array([1, 0, 0, 1, 0, 0]) }
  toFloat64Array() { return new Float64Array([1, 0, 0, 1, 0, 0]) }
  [key: string]: any
} as any

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择文件" }, { status: 400 })
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "请上传 .pdf 文件" }, { status: 400 })
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