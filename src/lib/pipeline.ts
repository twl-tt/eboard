import type { CharToken, Sentence } from "./types"
import { sentencePinyinArray, charPinyin } from "./pinyin"

const HANZI_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/

export function splitSentences(content: string): string[] {
  const out: string[] = []
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      out.push("")
      continue
    }
    let buf = ""
    for (const ch of trimmed) {
      buf += ch
      if ("。！？!?；;…".includes(ch)) {
        out.push(buf)
        buf = ""
      }
    }
    if (buf.trim()) out.push(buf)
  }
  return out
}

function isHanzi(ch: string) {
  return HANZI_RE.test(ch)
}

export function tokenize(sentence: string): CharToken[] {
  const chars = [...sentence]
  const tokens: CharToken[] = []
  let i = 0
  while (i < chars.length) {
    const ch = chars[i]
    if (/[A-Za-z]/.test(ch)) {
      let word = ch
      i++
      while (i < chars.length && /[A-Za-z'-]/.test(chars[i])) {
        word += chars[i]
        i++
      }
      tokens.push({ ch: word, py: null })
      continue
    }
    if (/[0-9]/.test(ch)) {
      let num = ch
      i++
      while (i < chars.length && /[0-9.,]/.test(chars[i])) {
        num += chars[i]
        i++
      }
      tokens.push({ ch: num, py: null })
      continue
    }
    if (ch.trim() === "") {
      i++
      continue
    }
    tokens.push({ ch, py: null })
    i++
  }
  const pyArr = sentencePinyinArray(sentence)
  if (pyArr && pyArr.length === tokens.length) {
    tokens.forEach((t, idx) => {
      if (isHanzi(t.ch)) t.py = pyArr[idx]
    })
  } else {
    for (const t of tokens) {
      if (isHanzi(t.ch)) t.py = charPinyin(t.ch)
    }
  }
  for (const t of tokens) {
    if (t.ch.length === 1 && isHanzi(t.ch)) t.py = charPinyin(t.ch)
  }
  return tokens
}

export interface TokenOverride {
  ch: string
  py?: string | null
}

export function extractOverrides(sentences: Sentence[]): Map<string, TokenOverride> {
  return new Map()
}

export function applyOverrides(sentences: Sentence[], _overrides: Map<string, TokenOverride>) {
  void sentences
}

export async function buildSentences(rawContent: string): Promise<Sentence[]> {
  const parts = splitSentences(rawContent)
  return parts.map((text, i) => {
    if (!text.trim()) return { id: `p${i}`, text: "", tokens: [] }
    return {
      id: `s${i}`,
      text,
      tokens: tokenize(text)
    }
  })
}
