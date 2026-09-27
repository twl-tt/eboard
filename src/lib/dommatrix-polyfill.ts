// DOMMatrix polyfill for pdfjs-dist (used by fabric.js when rendering PDFs)
// Ensures DOMMatrix is available before any component code runs

if (typeof globalThis.DOMMatrix === 'undefined') {
  // Fallback: create a minimal DOMMatrix stub
  const DOMMatrixStub = class {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0
    is2d = true
    is3d = false
    constructor() {}
    static fromFloat32Array() { return new DOMMatrixStub() }
    static fromFloat64Array() { return new DOMMatrixStub() }
    static fromMatrix() { return new DOMMatrixStub() }
    static fromString() { return new DOMMatrixStub() }
    static fromArray() { return new DOMMatrixStub() }
    toFloat32Array() { return new Float32Array([1, 0, 0, 1, 0, 0]) }
    toFloat64Array() { return new Float64Array([1, 0, 0, 1, 0, 0]) }
    toJSON() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }
    multiply() { return new DOMMatrixStub() }
    multiplySelf() { return this }
    preMultiplySelf() { return this }
    translateSelf() { return this }
    scaleSelf() { return this }
    rotateSelf() { return this }
    rotateXSelf() { return this }
    rotateYSelf() { return this }
    rotateZSelf() { return this }
    skewXSelf() { return this }
    skewYSelf() { return this }
    invertSelf() { return this }
    inverse() { return new DOMMatrixStub() }
  }
  globalThis.DOMMatrix = DOMMatrixStub as any
}

export {} // Make this a module