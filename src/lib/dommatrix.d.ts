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

declare module "dommatrix" {
  class CSSMatrix {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
    is2d: boolean
    is3d: boolean
    constructor(init?: string | number[])
    static fromFloat32Array(array: Float32Array): CSSMatrix
    static fromFloat64Array(array: Float64Array): CSSMatrix
    static fromMatrix(matrix?: CSSMatrix | DOMMatrix | JSONMatrix): CSSMatrix
    static fromString(transformString: string): CSSMatrix
    static fromArray(array: number[]): CSSMatrix
    toFloat32Array(): Float32Array
    toFloat64Array(): Float64Array
    toJSON(): { a: number; b: number; c: number; d: number; e: number; f: number }
    multiply(other: CSSMatrix): CSSMatrix
    multiplySelf(other: CSSMatrix): CSSMatrix
    preMultiplySelf(other: CSSMatrix): CSSMatrix
    translateSelf(x: number, y: number, z?: number): CSSMatrix
    scaleSelf(sx: number, sy?: number, sz?: number): CSSMatrix
    rotateSelf(angle: number, rx?: number, ry?: number, rz?: number): CSSMatrix
    rotateXSelf(angle: number): CSSMatrix
    rotateYSelf(angle: number): CSSMatrix
    rotateZSelf(angle: number): CSSMatrix
    skewXSelf(angle: number): CSSMatrix
    skewYSelf(angle: number): CSSMatrix
    invertSelf(): CSSMatrix
    inverse(): CSSMatrix
  }
  interface JSONMatrix {
    a: number
    b: number
    c: number
    d: number
    e: number
    f: number
  }
  export = CSSMatrix
}