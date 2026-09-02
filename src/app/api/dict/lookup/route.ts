import { NextRequest, NextResponse } from "next/server"
import iconv from "iconv-lite"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")
  if (!q || q.length !== 1) return NextResponse.json({ error: "Need single character" }, { status: 400 })

  try {
    const big5buf = iconv.encode(q, "big5")
    const big5hex = Array.from(big5buf).map(b => "%" + b.toString(16).padStart(2, "0")).join("")
    const url = `https://humanum.arts.cuhk.edu.hk/Lexis/lexi-can/search.php?q=${big5hex}`

    const res = await fetch(url)
    if (!res.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 })

    const ab = await res.arrayBuffer()
    const html = new TextDecoder("big5").decode(new Uint8Array(ab))

    if (html.includes("錯誤") || html.includes("輸入的字")) {
      return NextResponse.json({ word: q, pronunciations: [] })
    }

    const pronunciations: { jyutping: string; meaning: string }[] = []

    const trMatches = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/g) || []
    for (const row of trMatches) {
      const initialMatch = /<font\s+color=["']?red["']?[^>]*>([^<]+)<\/font>/.exec(row)
      const finalMatch = /<font\s+color=["']?green["']?[^>]*>([^<]+)<\/font>/.exec(row)
      const toneMatch = /<font\s+color=["']?blue["']?[^>]*>([^<]+)<\/font>/.exec(row)

      if (initialMatch && finalMatch && toneMatch) {
        const jyutping = initialMatch[1] + finalMatch[1] + toneMatch[1]

        const tdMatches = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) || []
        let meaning = ""
        for (const td of tdMatches) {
          const divMatch = /<div[^>]*>([\s\S]*?)<\/div>/.exec(td)
          if (divMatch && !divMatch[1].includes("display: none")) {
            meaning = divMatch[1].replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()
            break
          }
        }

        if (meaning) {
          pronunciations.push({ jyutping, meaning })
        }
      }
    }

    return NextResponse.json({ word: q, pronunciations })
  } catch (e) {
    return NextResponse.json({ error: "Failed", detail: String(e) }, { status: 500 })
  }
}
