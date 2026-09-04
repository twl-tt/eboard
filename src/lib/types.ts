export type PhoneticMode = "off" | "pinyin" | "jyutping"

export interface CharToken {
  ch: string
  py: string | null
}

export interface Sentence {
  id: string
  text: string
  tokens: CharToken[]
  explanation?: string
}

export interface CategoryTree {
  id: string
  name: string
  grade: string
  articles: { id: string; title: string }[]
}

export interface ArticleMeta {
  id: string
  title: string
  categoryId: string
  categoryName: string
  grade: string
  updatedAt: string
}

export interface ArticleFull extends ArticleMeta {
  rawContent: string
  sentences: Sentence[]
  highlights: import("./highlight").Highlight[]
  canvasState: unknown
}

export interface StudentDTO {
  id: string
  name: string
  seatNo: number | null
  className: string | null
  points: number
  recentLogs?: { id: string; delta: number; reason: string; createdAt: string }[]
}

export interface PollDTO {
  id: string
  question: string
  isActive: boolean
  correctIndex: number | null
  createdAt: string
  options: { id: string; text: string; votes: number }[]
}
