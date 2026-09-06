export type HighlightColor = "yellow" | "green" | "blue"

export interface Highlight {
  id: string
  sentenceId: string
  tokenStart: number
  tokenEnd: number
  color: HighlightColor
  createdAt?: string
}

export const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  yellow: "rgba(253,224,71,0.35)",
  green: "rgba(134,239,172,0.35)",
  blue: "rgba(59,130,246,0.35)"
}

export const HIGHLIGHT_LABEL: Record<HighlightColor, string> = {
  yellow: "黃",
  green: "綠",
  blue: "藍"
}

export interface GeneratedQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}
