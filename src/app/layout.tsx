import type { Metadata } from "next"
import Script from "next/script"
import "./globals.css"

export const metadata: Metadata = {
  title: "eBoard — 電子白板",
  description: "電子白板中文教學平台：雙語拼音、粵拼、螢光筆批註、白板繪圖、課室互動"
}

// DOMMatrix polyfill for pdfjs-dist/fabric.js - runs before any other scripts
const dommatrixPolyfill = `
(function() {
  if (typeof globalThis.DOMMatrix === 'undefined') {
    function DOMMatrixStub() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      this.is2d = true; this.is3d = false;
    }
    DOMMatrixStub.prototype = {
      constructor: DOMMatrixStub,
      fromFloat32Array: function() { return new DOMMatrixStub(); },
      fromFloat64Array: function() { return new DOMMatrixStub(); },
      fromMatrix: function() { return new DOMMatrixStub(); },
      fromString: function() { return new DOMMatrixStub(); },
      fromArray: function() { return new DOMMatrixStub(); },
      toFloat32Array: function() { return new Float32Array([1, 0, 0, 1, 0, 0]); },
      toFloat64Array: function() { return new Float64Array([1, 0, 0, 1, 0, 0]); },
      toJSON: function() { return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }; },
      multiply: function() { return new DOMMatrixStub(); },
      multiplySelf: function() { return this; },
      preMultiplySelf: function() { return this; },
      translateSelf: function() { return this; },
      scaleSelf: function() { return this; },
      rotateSelf: function() { return this; },
      rotateXSelf: function() { return this; },
      rotateYSelf: function() { return this; },
      rotateZSelf: function() { return this; },
      skewXSelf: function() { return this; },
      skewYSelf: function() { return this; },
      invertSelf: function() { return this; },
      inverse: function() { return new DOMMatrixStub(); }
    };
    DOMMatrixStub.fromFloat32Array = function() { return new DOMMatrixStub(); };
    DOMMatrixStub.fromFloat64Array = function() { return new DOMMatrixStub(); };
    DOMMatrixStub.fromMatrix = function() { return new DOMMatrixStub(); };
    DOMMatrixStub.fromString = function() { return new DOMMatrixStub(); };
    DOMMatrixStub.fromArray = function() { return new DOMMatrixStub(); };
    globalThis.DOMMatrix = DOMMatrixStub;
    if (typeof window !== 'undefined') window.DOMMatrix = DOMMatrixStub;
  }
})();
`;

const themeInit = `(function(){try{var t=localStorage.getItem('wrp-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <Script id="dommatrix-polyfill" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: dommatrixPolyfill }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
