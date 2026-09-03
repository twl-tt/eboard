import type { RhetoricKey } from "./types"

export function detectRhetoricBatch(sentences: string[]): (RhetoricKey | null)[] {
  return sentences.map(() => null)
}

export async function aiRhetoricBatch(_sentences: string[]): Promise<(RhetoricKey | null)[]> {
  return []
}