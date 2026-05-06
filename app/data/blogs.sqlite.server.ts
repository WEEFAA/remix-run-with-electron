import { desc, eq, like } from 'drizzle-orm'

import type { BlogPost, BlogRepository } from './blogs.server.ts'
import { seedBlogPosts, createExcerpt, createPostId, clonePost } from './blogs.server.ts'
import { blogPosts } from './blogs.schema.ts'
import { getDrizzleDb, getSqliteConnection } from './sqlite.server.ts'

let _isReady: boolean | null = null

export async function ensureSchema() {
  let sqlite = await getSqliteConnection()

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT NOT NULL,
      body TEXT NOT NULL,
      published_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx ON blog_posts (published_at DESC);
    CREATE INDEX IF NOT EXISTS blog_posts_title_idx ON blog_posts (title);
  `)
}

export async function seedBlogDb() {
  await ensureSchema()
  let db = await getDrizzleDb()
  let existing = await db.select({ id: blogPosts.id }).from(blogPosts).limit(1)
  if (existing.length > 0) return

  await db.insert(blogPosts).values(seedBlogPosts.map(clonePost))
}

async function assertReady() {
  if (_isReady === true) return
  if (_isReady === false) {
    throw new Error('Blog database is not initialized. Run `npm run seed`.')
  }

  let sqlite = await getSqliteConnection()
  let row = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='blog_posts'")
    .get()

  if (!row) {
    _isReady = false
    throw new Error('Blog database is not initialized. Run `npm run seed`.')
  }

  _isReady = true
}

function toDomain(row: typeof blogPosts.$inferSelect): BlogPost {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    publishedAt: row.publishedAt,
  }
}

export function createSqliteBlogRepository(): BlogRepository {
  return {
    async listPosts(input) {
      await assertReady()
      let db = await getDrizzleDb()

      let query = input?.query?.trim()
      if (query) {
        let rows = await db
          .select()
          .from(blogPosts)
          .where(like(blogPosts.title, `%${query}%`))
          .orderBy(desc(blogPosts.publishedAt))
        return rows.map(toDomain)
      }

      let rows = await db.select().from(blogPosts).orderBy(desc(blogPosts.publishedAt))
      return rows.map(toDomain)
    },

    async getPostById(id) {
      await assertReady()
      let db = await getDrizzleDb()
      let rows = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1)
      return rows.length > 0 ? toDomain(rows[0]) : null
    },

    async createPost(input) {
      await assertReady()
      let db = await getDrizzleDb()

      // Ensure unique id in a loop (guest posting, no auth).
      let now = Date.now()
      let existingIds = await db.select({ id: blogPosts.id }).from(blogPosts)
      let baseId = createPostId(input.title, now, existingIds)
      let id = baseId

      // If collision still happens due to race, retry with suffix.
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          let post: BlogPost = {
            id,
            title: input.title,
            body: input.body,
            excerpt: createExcerpt(input.body),
            publishedAt: now,
          }

          await db.insert(blogPosts).values(post)
          return post
        } catch {
          id = `${baseId}-${attempt + 1}`
        }
      }

      throw new Error('Failed to create post')
    },
  }
}

