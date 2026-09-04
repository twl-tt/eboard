import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  // Add className column if it doesn't exist
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "class" TEXT;')
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Student_class_idx" ON "Student"("class");')
    console.log("schema updated: added 'class' column to Student")
  } catch (e) {
    console.error("migration failed:", e)
    throw e
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
