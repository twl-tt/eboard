import { NextResponse } from "next/server"

const MAX_SIZE = 8 * 1024 * 1024
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/gif"]

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) return NextResponse.json({ error: "蝻箏?瑼?" }, { status: 400 })
    if (!ALLOWED.includes(file.type)) return NextResponse.json({ error: `銝?渡??澆?嚗?{file.type}` }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: "瑼?頞? 8MB" }, { status: 400 })

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const { put } = await import("@vercel/blob")
      const blob = await put(`whiteboard/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`, file, {
        access: "public",
        contentType: file.type
      })
      return NextResponse.json({ url: blob.url })
    }

    const { mkdir, writeFile } = await import("fs/promises")
    const path = await import("path")
    const dir = path.join(process.cwd(), "public", "uploads")
    await mkdir(dir, { recursive: true })
    const safe = `${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`
    await writeFile(path.join(dir, safe), Buffer.from(await file.arrayBuffer()))
    return NextResponse.json({ url: `/uploads/${safe}` })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
