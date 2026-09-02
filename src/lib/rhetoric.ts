import type { RhetoricKey } from "./types"

const RULES: [RhetoricKey, RegExp][] = [
  ["反問", /(難道|豈|怎能|怎麼能|何嘗|何曾|豈能|豈會)[^。！？]*[？?]\s*$/],
  ["比喻", /(像|好像|好似|如同|彷彿|仿佛|猶如|宛如|好比|有如|(成|變成)了)/],
  ["誇張", /(三千尺|萬丈|九萬里|千鈞|一日千里|翻天覆地|天崩地裂|驚天動地|排山倒海|水泄不通|人山人海)/],
  ["擬人", /(在(唱歌|跳舞|微笑|歡笑|低語|訴說)|向(我們)?(招手|點頭|微笑)|(唱起|跳起)了?(歌|舞))/]
]

export function detectRhetoricBatch(sentences: string[]): (RhetoricKey | null)[] {
  return sentences.map((s) => {
    for (const [key, re] of RULES) {
      if (re.test(s)) return key
    }
    if (isParallel(s)) return "排比"
    if (isCouplet(s)) return "對偶"
    return null
  })
}

function isParallel(s: string): boolean {
  const parts = s.split(/[，,、]/).map((p) => p.trim()).filter(Boolean)
  if (parts.length < 3) return false
  const heads = parts.map((p) => [...p].slice(0, 2).join(""))
  let repeats = 0
  for (let i = 1; i < heads.length; i++) {
    if (heads[i] === heads[0] || heads[i] === heads[i - 1]) repeats++
  }
  const similarLen = parts.filter((p) => Math.abs(p.length - parts[0].length) <= 2).length
  return repeats >= 1 && similarLen >= 3 && parts.every((p) => p.length >= 2)
}

function isCouplet(s: string): boolean {
  const halves = s.split(/[,，;；]/).map((h) => h.replace(/[。！？!?；;]/g, "").trim()).filter(Boolean)
  if (halves.length !== 2) return false
  const [a, b] = halves
  const ca = [...a].filter((c) => /[\u4e00-\u9fff]/.test(c)).length
  const cb = [...b].filter((c) => /[\u4e00-\u9fff]/.test(c)).length
  return ca === cb && ca >= 3 && a !== b
}

export async function aiRhetoricBatch(sentences: string[]): Promise<(RhetoricKey | null)[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key || sentences.length === 0) return []
  const base = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1"
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini"
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "你是中文修辭學專家。對每個句子判斷修辭手法，只能是：比喻、擬人、排比、誇張、反問、設問、對偶、借代 或 null。只回覆 JSON：{\"tags\":[...]}，tags 長度必須等於句子數。"
          },
          { role: "user", content: JSON.stringify({ sentences }) }
        ]
      })
    })
    if (!res.ok) return []
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content
    if (!content) return []
    const parsed = JSON.parse(content) as { tags?: (string | null)[] }
    const valid: RhetoricKey[] = ["比喻", "擬人", "排比", "誇張", "反問", "設問", "對偶", "借代"]
    const tags = parsed.tags ?? []
    return sentences.map((_, i) => {
      const t = tags[i]
      if (typeof t !== "string") return null
      return (valid.includes(t as RhetoricKey) ? (t as RhetoricKey) : null) satisfies RhetoricKey | null
    })
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}
