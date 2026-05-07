export interface BlogPost {
  id: string
  title: string
  excerpt: string
  body: string
  publishedAt: number
}

export interface BlogRepository {
  listPosts(input?: { query?: string }): Promise<BlogPost[]>
  getPostById(id: string): Promise<BlogPost | null>
  createPost(input: { title: string; body: string }): Promise<BlogPost>
}

export interface BlogRepositoryFactory {
  createRepository(): BlogRepository
}

export const seedBlogPosts: BlogPost[] = [
  {
    id: 'hello-remix-electron',
    title: 'Hello Remix in Electron',
    excerpt: 'Why running Remix with an Electron custom protocol keeps the app architecture simple.',
    body:
      'This project runs Remix v3 inside Electron with a Fetch-based protocol adapter.\n\n' +
      'The same route contract powers landing pages and blog pages without adding a second API layer.',
    publishedAt: Date.parse('2026-04-01T09:00:00.000Z'),
  },
  {
    id: 'simple-blog-architecture',
    title: 'Simple Blog Architecture',
    excerpt: 'A lightweight route-first approach for /, /blogs, and /blogs/:id.',
    body:
      'Start with routes.ts as the contract, then map controllers in router.ts.\n\n' +
      'This keeps ownership clear and avoids tight coupling between rendering and transport.',
    publishedAt: Date.parse('2026-04-10T09:00:00.000Z'),
  },
]

export function clonePost(post: BlogPost): BlogPost {
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    body: post.body,
    publishedAt: post.publishedAt,
  }
}

class InMemoryBlogRepository implements BlogRepository {
  #posts: BlogPost[]

  constructor(posts: BlogPost[]) {
    this.#posts = posts.map(clonePost)
  }

  async listPosts(input?: { query?: string }) {
    let query = input?.query?.trim().toLowerCase()
    let posts = this.#posts
      .map(clonePost)
      .sort((a, b) => b.publishedAt - a.publishedAt)

    if (!query) return posts
    return posts.filter((post) => post.title.toLowerCase().includes(query))
  }

  async getPostById(id: string) {
    let post = this.#posts.find((entry) => entry.id === id)
    return post ? clonePost(post) : null
  }

  async createPost(input: { title: string; body: string }) {
    let now = Date.now()
    let id = createPostId(input.title, now, this.#posts)
    let post: BlogPost = {
      id,
      title: input.title,
      body: input.body,
      excerpt: createExcerpt(input.body),
      publishedAt: now,
    }

    this.#posts = [...this.#posts, post]
    return clonePost(post)
  }
}

class InMemoryBlogRepositoryFactory implements BlogRepositoryFactory {
  #seedPosts: BlogPost[]

  constructor(posts: BlogPost[]) {
    this.#seedPosts = posts.map(clonePost)
  }

  createRepository() {
    return new InMemoryBlogRepository(this.#seedPosts)
  }
}

export function createBlogRepositoryFactory(
  posts: BlogPost[] = seedBlogPosts,
): BlogRepositoryFactory {
  return new InMemoryBlogRepositoryFactory(posts)
}

export const inMemoryBlogRepository = createBlogRepositoryFactory().createRepository()

export function createExcerpt(body: string) {
  let text = body.replace(/\s+/g, ' ').trim()
  if (text.length <= 140) return text
  return `${text.slice(0, 137)}...`
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function createPostId(
  title: string,
  now: number,
  existingPosts: Array<{ id: string }>,
) {
  let base = slugify(title) || `post-${now}`
  let candidate = base
  let suffix = 1

  while (existingPosts.some((post) => post.id === candidate)) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }

  return candidate
}
