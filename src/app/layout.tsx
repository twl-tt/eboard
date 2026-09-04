import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "eBoard — 電子白板",
  description: "電子白板中文教學平台：雙語拼音、粵拼、螢光筆批註、白板繪圖、課室互動"
}

const themeInit = `(function(){try{var t=localStorage.getItem('wrp-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  )
}
