# Whiteboard Reader Pro

Next.js 14 App Router + TypeScript + Prisma (Neon) + Fabric.js whiteboard.

## Commands
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run setup` — prisma generate + prisma db push (needs DATABASE_URL in .env)
- `npm run build` — production build
- `npm run typecheck` — tsc --noEmit

## Notes
- Pages: `/whiteboard`, `/admin`, `/poll/[id]`
- APIs under `src/app/api/**`
- Jyutping dictionary: `src/lib/jyutping.ts`
- Text pipeline: `src/lib/pipeline.ts`
