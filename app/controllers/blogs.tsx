import type { Controller } from 'remix/fetch-router'
import { redirect } from 'remix/response/redirect'
import * as s from 'remix/data-schema'
import * as f from 'remix/data-schema/form-data'
import { maxLength, minLength } from 'remix/data-schema/checks'

import type { BlogPost } from '../data/blogs.server.ts'
import { blogRepository } from '../data/blogRepository.server.ts'
import type { AppContext } from '../router.ts'
import { routes } from '../routes.ts'
import { Layout } from '../ui/layout.tsx'
import { render } from '../utils/render.tsx'
// import { SampleButton } from '../ui/SampleButton.tsx'

const blogPostFormSchema = f.object({
  title: f.field(s.string().pipe(minLength(1)).pipe(maxLength(140))),
  body: f.field(s.string().pipe(minLength(1))),
})

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function createBlogIndexPage(props: { posts: BlogPost[]; query: string }) {
  return function BlogIndexPage() {
    return () => (
      <Layout title="Blogs">
        <div class="stack">
          <div class="postMeta">
            <h1>Blogs</h1>
            <a class="pill" href={routes.blogs.new.href()}>
              Write a post
            </a>
          </div>

          {/* <SampleButton ctr={1} /> */}
          <p class="muted">Minimal posts list, stored locally.</p>

          <div class="card">
            <div class="cardPad">
              <form method="get" action={routes.blogs.index.href()}>
                <label>
                  Search titles
                  <input type="text" name="q" value={props.query} />
                </label>
                <div class="buttonRow" style={{ marginTop: 12 }}>
                  <button type="submit">Search</button>
                  {props.query ? (
                    <a class="pill" href={routes.blogs.index.href()}>
                      Clear
                    </a>
                  ) : null}
                </div>
              </form>
            </div>
          </div>

          {props.posts.length === 0 ? <p class="muted">No posts found.</p> : null}

          <ul class="postList">
            {props.posts.map((post) => (
              <li key={post.id} class="card">
                <div class="cardPad stack">
                  <div class="postMeta">
                    <a href={routes.blogs.show.href({ id: post.id })}>
                      <strong>{post.title}</strong>
                    </a>
                    <span class="muted" style={{ fontSize: 13 }}>
                      {formatDate(post.publishedAt)}
                    </span>
                  </div>
                  <p class="muted">{post.excerpt}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Layout>
    )
  }
}

function createBlogNewPage(props: {
  values?: { title?: string; body?: string }
  error?: string
}) {
  return function BlogNewPage() {
    return () => (
      <Layout title="New blog post">
        <div class="stack">
          <div class="postMeta">
            <h1>Write a new post</h1>
            <a class="pill" href={routes.blogs.index.href()}>
              Back
            </a>
          </div>

          <p class="muted">Guest posting is enabled. Body accepts MDX-flavored markdown text.</p>
          {props.error ? (
            <div class="card" style={{ borderColor: 'rgba(220, 38, 38, 0.35)' }}>
              <div class="cardPad" style={{ color: '#b91c1c' }}>
                {props.error}
              </div>
            </div>
          ) : null}

          <div class="card">
            <div class="cardPad">
              <form method="post" action={routes.blogs.create.href()}>
                <div class="stack">
                  <label>
                    Title
                    <input name="title" value={props.values?.title ?? ''} />
                  </label>
                  <label>
                    Body (MDX)
                    <textarea name="body" rows={18}>
                      {props.values?.body ?? ''}
                    </textarea>
                  </label>
                  <div class="buttonRow">
                    <button type="submit">Publish</button>
                    <a class="pill" href={routes.blogs.index.href()}>
                      Cancel
                    </a>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Layout>
    )
  }
}

function createBlogShowPage(props: { post: BlogPost }) {
  return function BlogShowPage() {
    return () => (
      <Layout title={props.post.title}>
        <div class="stack">
          <div class="postMeta">
            <a class="pill" href={routes.blogs.index.href()}>
              Back
            </a>
            <span class="muted" style={{ fontSize: 13 }}>
              {formatDate(props.post.publishedAt)}
            </span>
          </div>

          <h1>{props.post.title}</h1>

          <article class="prose card">
            <div class="cardPad">
              {props.post.body.split(/\n\n+/).map((paragraph, index) => (
                <p key={`${props.post.id}-${index}`}>{paragraph}</p>
              ))}
            </div>
          </article>
        </div>
      </Layout>
    )
  }
}

const blogsController = {
  middleware: [],
  actions: {
    async index({ request, url }) {
      let query = url.searchParams.get('q') ?? ''
      let posts = await blogRepository.listPosts({ query })
      let Page = createBlogIndexPage({ posts, query })
      return render(<Page />, request)
    },

    async new({ request }) {
      let Page = createBlogNewPage({})
      return render(<Page />, request)
    },

    async create({ request }) {
      let formData = await request.formData()
      let parsed = s.parseSafe(blogPostFormSchema, formData)

      if (!parsed.success) {
        let Page = createBlogNewPage({
          error: 'Invalid input.',
          values: {
            title: String(formData.get('title') ?? ''),
            body: String(formData.get('body') ?? ''),
          },
        })
        return render(<Page />, request, { status: 400 })
      }

      let post = await blogRepository.createPost({
        title: parsed.value.title,
        body: parsed.value.body,
      })
      return redirect(routes.blogs.show.href({ id: post.id }), 303)
    },

    async show({ params, request }) {
      let post = await blogRepository.getPostById(params.id)
      if (!post) return new Response('Not Found', { status: 404 })

      let Page = createBlogShowPage({ post })
      return render(<Page />, request)
    },
  },
} satisfies Controller<typeof routes.blogs, AppContext>

export default blogsController
