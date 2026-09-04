import { PrismaClient } from "@prisma/client"
const db = new PrismaClient()
;(async () => {
  try {
    await db.$executeRawUnsafe('ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "group" TEXT;')
    await db.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Student_group_idx" ON "Student"("group");')
    console.log("Student.group column added")
  } catch (e) {
    console.error("migration error:", e.message)
  } finally {
    await db.$disconnect()
  }
})()
