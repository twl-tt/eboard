import { NextResponse } from "next/server"
import { ZodError, type ZodSchema } from "zod"

export function jsonError(e: unknown) {
  if (e instanceof ZodError) {
    return NextResponse.json({ error: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 })
  }
  const msg = e instanceof Error ? e.message : String(e)
  return NextResponse.json({ error: msg }, { status: 500 })
}

export async function parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T> {
  const body = await req.json()
  return schema.parse(body)
}
