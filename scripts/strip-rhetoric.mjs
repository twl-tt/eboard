import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

async function main() {
  const articles = await db.article.findMany({ select: { id: true, title: true, sentences: true } })
  let changed = 0
  for (const a of articles) {
    const arr = a.sentences
    let dirty = false
    for (const s of arr) {
      if (s && typeof s === "object" && "rhetoric" in s) {
        delete s.rhetoric
        dirty = true
      }
    }
    if (dirty) {
      await db.article.update({ where: { id: a.id }, data: { sentences: arr } })
      changed++
      console.log(`updated: ${a.title}`)
    }
  }
  console.log(`done — ${changed}/${articles.length} articles updated`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
