import { seedBlogDb } from '../app/data/blogs.sqlite.server.ts'

seedBlogDb()
  .then(() => {
    console.log('Seed complete.')
  })
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })

