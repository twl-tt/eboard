export type PhoneticMode = "off" | "pinyin" | "jyutping"

export type RhetoricKey =
  | "比喻"
  | "擬人"
  | "排比"
  | "誇張"
  | "反問"
  | "設問"
  | "對偶"
  | "借代"
  | "疊詞"
  | "感嘆"
  | "引用"
  | "對比"
  | "聯想"

export const RHETORIC_KEYS: RhetoricKey[] = ["比喻", "擬人", "排比", "誇張", "反問", "設問", "對偶", "借代", "疊詞", "感嘆", "引用", "對比", "聯想"]

export interface CharToken {
  ch: string
  py: string | null
}

export interface Sentence {
  id: string
  text: string
  tokens: CharToken[]
  rhetoric: RhetoricKey | null
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
