import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
;(async () => {
  try {
    await db.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS "Tag" ("id" TEXT NOT NULL DEFAULT gen_random_uuid()::text, "name" TEXT NOT NULL, "category" TEXT NOT NULL, "color" TEXT NOT NULL DEFAULT \'violet\', "sortOrder" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"));')
    await db.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Tag_name_category_key" ON "Tag"("name", "category");')
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Tag_category_idx" ON "Tag"("category");')
    console.log("Tag table created")
  } catch (e) {
    console.error("migration error:", e.message)
  } finally {
    await db.$disconnect()
  }
})()
