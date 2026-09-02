export type HighlightColor = "purple" | "red" | "blue"

export interface Highlight {
  id: string
  sentenceId: string
  tokenStart: number
  tokenEnd: number
  color: HighlightColor
  createdAt?: string
}

export const HIGHLIGHT_BG: Record<HighlightColor, string> = {
  purple: "rgba(168,85,247,0.32)",
  red: "rgba(239,68,68,0.32)",
  blue: "rgba(59,130,246,0.32)"
}

export const HIGHLIGHT_LABEL: Record<HighlightColor, string> = {
  purple: "紫",
  red: "紅",
  blue: "藍"
}

export interface GeneratedQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}
