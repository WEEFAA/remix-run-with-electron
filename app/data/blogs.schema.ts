import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey().notNull(),
  title: text('title').notNull(),
  excerpt: text('excerpt').notNull(),
  body: text('body').notNull(),
  publishedAt: integer('published_at', { mode: 'number' }).notNull(),
})

