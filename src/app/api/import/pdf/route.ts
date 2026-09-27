import { NextResponse } from "next/server"

export const runtime = "nodejs"

// DOMMatrix polyfill for pdfjs-dist (used by pdf-parse)
const polyfillDOMMatrix = async () => {
  if (typeof globalThis.DOMMatrix !== 'undefined') return

  try {
    const dommatrix = await import('dommatrix')
    globalThis.DOMMatrix = dommatrix as any
  } catch {
    // Fallback: create a minimal DOMMatrix stub
    class DOMMatrixStub {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
      is2d = true
      is3d = false
      constructor() {}
      static fromFloat32Array() { return new DOMMatrixStub() }
      static fromFloat64Array() { return new DOMMatrixStub() }
      static fromMatrix() { return new DOMMatrixStub() }
      static fromString() { return new DOMMatrixStub() }
      static fromArray() { return new DOMMatrixStub() }
      toFloat32Array() { return new Float32Array([1, 0, 0, 1, 0, 0]) }
      toFloat64Array() { return new Float64Array([1, 0, 0, 1, 0, 0]) }
      toJSON() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }
      multiply() { return new DOMMatrixStub() }
      multiplySelf() { return this }
      preMultiplySelf() { return this }
      translateSelf() { return this }
      scaleSelf() { return this }
      rotateSelf() { return this }
      rotateXSelf() { return this }
      rotateYSelf() { return this }
      rotateZSelf() { return this }
      skewXSelf() { return this }
      skewYSelf() { return this }
      invertSelf() { return this }
      inverse() { return new DOMMatrixStub() }
    }
    globalThis.DOMMatrix = DOMMatrixStub as any
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "请选择文件" }, { status: 400 })
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "请上传 .pdf 文件" }, { status: 400 })
    }

    await polyfillDOMMatrix()

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