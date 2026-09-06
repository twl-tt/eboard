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
  yellow: "rgba(254,240,138,0.5)",
  green: "rgba(187,247,208,0.5)",
  blue: "rgba(147,197,253,0.5)"
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
