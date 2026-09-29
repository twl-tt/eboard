import { NextResponse } from "next/server"
import "@/lib/server-polyfill"

export const runtime = "nodejs"

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