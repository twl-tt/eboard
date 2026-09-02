import { pinyin } from "pinyin-pro"

export function sentencePinyinArray(sentence: string): string[] | null {
  try {
    return pinyin(sentence, { type: "array", toneType: "symbol", v: true, nonZh: "consecutive" }) as string[]
  } catch {
    return null
  }
}

export function charPinyin(ch: string): string | null {
  try {
    if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(ch)) return null
    return pinyin(ch, { type: "string", toneType: "symbol", v: true })
  } catch {
    return null
  }
}
