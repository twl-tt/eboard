# Whiteboard Reader Pro — 校本智慧電子白板教學平台

全功能校本 Web 平台：100+ 課文管理、自動普通話拼音與粵拼、多音字校正、雙語 TTS 朗讀、Explain Everything 式白板繪圖、圖片上載、課室互動（抽籤 / 加分 / 即時投票）與 AI 修辭標註。

## 技術棧

Next.js 14 (App Router, TS) · Prisma + Neon PostgreSQL · Fabric.js 白板 · @hello-pangea/dnd 卡片重組 · Tailwind CSS · Framer Motion · canvas-confetti · pinyin-pro · Web Speech API · qrcode.react · jsPDF/html2canvas 匯出 · Vercel Blob（可選，無 token 時回落本機 `public/uploads`）· OpenAI 相容 API（可選修辭 AI）

## 快速開始

```bash
npm install
cp .env.example .env      # 填入 Neon DATABASE_URL
npm run setup             # prisma generate + db push
npm run dev               # http://localhost:3000
```

1. 開 `/admin` → 分類管理 → 建立「年級 + 分類」。
2. 課文管理 → 新增課文（貼上文字或匯入 .txt/.docx），系統自動切句、生成拼音/粵拼、AI 標註修辭。
3. 學生管理 → 新增或 CSV 匯入（每行 `姓名,座號`）。
4. 開 `/whiteboard` 教學：選課文 → 切拼音模式 → 朗讀 → 畫筆/螢光筆/圖片 → 抽籤加分投票。

## API 一覽

| 方法 | 端點 | 用途 |
|---|---|---|
| POST | `/api/articles` | 建立課文（切句 + 雙語拼音 + 修辭解析） |
| GET/PATCH/DELETE | `/api/articles/:id` | 讀取 / 更新（內容變更會重解析並保留人工校正）/ 刪除 |
| PATCH | `/api/articles/:id/token` | 多音字 / 粵拼 / 句子修辭手動校正 |
| PATCH | `/api/articles/:id/canvas` | 儲存白板圖層 JSON |
| POST | `/api/upload` | 圖片上載（Blob 或本機） |
| POST | `/api/import/docx` | .docx 轉純文字 |
| GET/POST/PATCH/DELETE | `/api/students*` | 學生 CRUD、CSV 匯入、歷史 |
| POST | `/api/classroom/points` | 加扣分 + 審計日誌（事務） |
| GET/POST | `/api/classroom/polls` | 投票列表 / 建立 |
| GET/PATCH/POST | `/api/classroom/polls/:id` | 即時結果 / 結束投票 / 投票 |

## 設計說明

- **即時同步**：投票與分數採 2–3 秒輪詢同步（serverless 友好）；如需 WebSocket 可加 PartyKit/Socket.io 層。
- **粵拼字典**：內建常用字表在 `src/lib/jyutping.ts`，未收錄字顯示 `?`，可在白板或後台「多音字微調」手動校正；亦可直接擴充該字典。
- **AI 修辭**：設定 `OPENAI_API_KEY` 後自動標註；未設定則用規則啟發式。
- **TTS**：Web Speech API，粵語需系統已安裝 zh-HK 語音（Windows 建議安裝香港話語音包）。
