import { NextResponse } from "next/server"

export const runtime = "nodejs"

// DOMMatrix polyfill for pdfjs-dist (used by pdf-parse and potentially pptx-parser)
// Must be at top level to run before pdfjs loads
if (typeof globalThis.DOMMatrix === 'undefined') {
  try {
    const dommatrix = require('dommatrix')
    globalThis.DOMMatrix = dommatrix
  } catch {
    // Fallback: create a minimal DOMMatrix stub
    const DOMMatrixStub = class {
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
    if (!file.name.toLowerCase().endsWith(".pptx")) {
      return NextResponse.json({ error: "请上传 .pptx 文件" }, { status: 400 })
    }

    const pptxParser: any = await import("pptx-parser")
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed: any = await pptxParser.default(buffer)

    const slides = parsed.slides.map((slide: any, index: number) => ({
      index: index + 1,
      shapes: slide.shapes ? slide.shapes.map((shape: any) => ({
        text: shape.text ?? "",
        type: shape.type ?? "unknown",
        left: shape.left ?? 0,
        top: shape.top ?? 0,
        width: shape.width ?? 0,
        height: shape.height ?? 0
      })) : [],
      images: slide.images ? slide.images.map((img: any) => ({
        url: img.url ?? "",
        width: img.width ?? 0,
        height: img.height ?? 0
      })) : []
    }))

    const fullText = slides.map((s: any) => s.shapes.map((sh: any) => sh.text).join("\n")).join("\n\n---\n\n")

    return NextResponse.json({
      slides,
      fullText,
      slideCount: slides.length
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "服务器内部错误" }, { status: 500 })
  }
}