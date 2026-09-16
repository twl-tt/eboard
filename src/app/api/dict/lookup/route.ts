import { NextRequest, NextResponse } from "next/server"
import iconv from "iconv-lite"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q || q.length !== 1) return NextResponse.json({ error: "Need single character" }, { status: 400 })

  try {
    const big5buf = iconv.encode(q, "big5")
    const big5hex = Array.from(big5buf).map(b => "%" + b.toString(16).padStart(2, "0")).join("")
    const cuhkUrl = `https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/search.php?q=${big5hex}`

    const cuhkRes = await fetch(cuhkUrl)
    if (!cuhkRes.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 })

    const cuhkAb = await cuhkRes.arrayBuffer()
    const cuhkHtml = new TextDecoder("big5").decode(new Uint8Array(cuhkAb))

    if (cuhkHtml.includes("錯誤") || cuhkHtml.includes("輸入的字")) {
      return NextResponse.json({ word: q, pronunciations: [] })
    }

    // Fetch moedict.tw definition in parallel for fallback
    const moedictDef = await getMoedictDefinition(q)

    const pronunciations: { jyutping: string; meaning: string }[] = []

    const trMatches = cuhkHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []
    for (const row of trMatches) {
      const initialMatch = /<font\s+color=["']?red["']?[^>]*>([^<]+)<\/font>/.exec(row)
      const finalMatch = /<font\s+color=["']?green["']?[^>]*>([^<]+)<\/font>/.exec(row)
      const toneMatch = /<font\s+color=["']?blue["']?[^>]*>([^<]+)<\/font>/.exec(row)

      if (initialMatch && finalMatch && toneMatch) {
        const jyutping = initialMatch[1] + finalMatch[1] + toneMatch[1]

        // Try CUHK-specific definition first (per-pronunciation)
        let definition = extractCuhkDefinition(cuhkHtml, jyutping)
        
        // Fall back to moedict.tw definition if CUHK doesn't have one
        if (!definition) {
          definition = moedictDef || `${q} 詞義`
        }

        pronunciations.push({ jyutping, meaning: definition })
      }
    }

    return NextResponse.json({ word: q, pronunciations })
  } catch (e) {
    return NextResponse.json({ error: "Failed", detail: String(e) }, { status: 500 })
  }
}

function extractCuhkDefinition(cuhkHtml: string, jyutping: string): string | null {
  const match = cuhkHtml.match(new RegExp(`id="${escapeRegex(jyutping)}_detial"[^>]*style="display: none"[^>]*>([\\s\\S]*?)<\\/div>`))
  if (match && match[1]) {
    return match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }
  return null
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

async function getMoedictDefinition(char: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.moedict.tw/${char}`, {
      headers: { "Accept": "text/html" }
    })
    if (!res.ok) return null

    const html = await res.text()

    const metaMatch = /<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*\/>/.exec(html)
    if (metaMatch && metaMatch[1]) {
      return metaMatch[1].trim()
    }

    const ogMatch = /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)["'][^>]*\/>/.exec(html)
    if (ogMatch && ogMatch[1]) {
      return ogMatch[1].trim()
    }

    return null
  } catch {
    return null
  }
}

async function tryMoedictLookup(char: string): Promise<{ pronunciations: { jyutping: string; meaning: string }[] } | null> {
  try {
    const res = await fetch(`https://www.moedict.tw/${char}`, {
      headers: { "Accept": "application/json" }
    })
    if (!res.ok) return null
    const data = await res.json()
    if (data && data.pronunciations && Array.isArray(data.pronunciations)) {
      return { pronunciations: data.pronunciations }
    }
    const html = await res.text()
    const initialMatch = /<font\s+color=["']?red["']?[^>]*>([^<]+)<\/font>/.exec(html)
    const finalMatch = /<font\s+color=["']?green["']?[^>]*>([^<]+)<\/font>/.exec(html)
    const toneMatch = /<font\s+color=["']?blue["']?[^>]*>([^<]+)<\/font>/.exec(html)
    if (initialMatch && finalMatch && toneMatch) {
      const jyutping = initialMatch[1] + finalMatch[1] + toneMatch[1]
      return { pronunciations: [{ jyutping, meaning: `${char} 釋義` }] }
    }
    return null
  } catch {
    return null
  }
}