declare module "pptx-parser" {
  interface Shape {
    text?: string
    type?: string
    left?: number
    top?: number
    width?: number
    height?: number
  }
  interface Slide {
    shapes?: Shape[]
    images?: { url?: string; width?: number; height?: number }[]
  }
  interface PptxParseResult {
    slides: Slide[]
    slideCount: number
    fullText: string
  }
  export default function pptxParser(buffer: Buffer): Promise<PptxParseResult>
}