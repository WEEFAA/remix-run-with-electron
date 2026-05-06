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
import { SampleButton } from '../ui/SampleButton.tsx'

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
        <h1>Blogs</h1>
        <SampleButton ctr={1} />
        <p>
          Read articles from this local Electron Remix app. Subscribe using{' '}
          <a href={routes.blogs.rss.href()}>RSS</a>.
        </p>
        <p>
          <a href={routes.blogs.new.href()}>Write a post as guest</a>
        </p>
        <form method="get" action={routes.blogs.index.href()}>
          <label>
            Search titles: <input type="text" name="q" value={props.query} />
          </label>{' '}
          <button type="submit">Search</button>
        </form>
        <ul>
          {props.posts.map((post) => (
            <li key={post.id}>
              <h2>
                <a href={routes.blogs.show.href({ id: post.id })}>{post.title}</a>
              </h2>
              <p>
                <small>Published {formatDate(post.publishedAt)}</small>
              </p>
              <p>{post.excerpt}</p>
            </li>
          ))}
        </ul>
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
        <h1>Write a new post</h1>
        <p>Guest posting is enabled. Body accepts MDX-flavored markdown text.</p>
        {props.error ? <p style={{ color: 'crimson' }}>{props.error}</p> : null}

        <form method="post" action={routes.blogs.create.href()}>
          <p>
            <label>
              Title
              <br />
              <input name="title" value={props.values?.title ?? ''} />
            </label>
          </p>
          <p>
            <label>
              Body (MDX)
              <br />
              <textarea name="body" rows={18} cols={80}>
                {props.values?.body ?? ''}
              </textarea>
            </label>
          </p>
          <p>
            <button type="submit">Publish</button>{' '}
            <a href={routes.blogs.index.href()}>Cancel</a>
          </p>
        </form>
      </Layout>
    )
  }
}

function createBlogShowPage(props: { post: BlogPost }) {
  return function BlogShowPage() {
    return () => (
      <Layout title={props.post.title}>
        <p>
          <a href={routes.blogs.index.href()}>Back to all blogs</a>
        </p>
        <h1>{props.post.title}</h1>
        <p>
          <small>Published {formatDate(props.post.publishedAt)}</small>
        </p>
        <article>
          {props.post.body.split(/\n\n+/).map((paragraph, index) => (
            <p key={`${props.post.id}-${index}`}>{paragraph}</p>
          ))}
        </article>
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

    async rss({ request }) {
      let posts = await blogRepository.listPosts()
      let origin = getOrigin(request.url)

      let xml = buildRssXml({
        title: 'Electron Remix Blog',
        description: 'Simple blog powered by Remix v3 and Electron protocol handlers.',
        siteUrl: new URL(routes.blogs.index.href(), origin).toString(),
        feedUrl: new URL(routes.blogs.rss.href(), origin).toString(),
        posts: posts.map((post) => ({
          title: post.title,
          description: post.excerpt,
          guid: post.id,
          url: new URL(routes.blogs.show.href({ id: post.id }), origin).toString(),
          publishedAt: post.publishedAt,
        })),
      })

      return new Response(xml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      })
    },
  },
} satisfies Controller<typeof routes.blogs, AppContext>

function getOrigin(requestUrl: string) {
  let url = new URL(requestUrl)
  if (url.origin !== 'null') return url.origin
  return `${url.protocol}//${url.host || 'local'}`
}

function xmlEscape(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function buildRssXml(input: {
  title: string
  description: string
  siteUrl: string
  feedUrl: string
  posts: Array<{
    title: string
    description: string
    guid: string
    url: string
    publishedAt: number
  }>
}) {
  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(input.title)}</title>
    <link>${xmlEscape(input.siteUrl)}</link>
    <description>${xmlEscape(input.description)}</description>
    <atom:link href="${xmlEscape(input.feedUrl)}" rel="self" type="application/rss+xml" />
    ${input.posts
      .map((post) => {
        let pubDate = new Date(post.publishedAt).toUTCString()
        return `
    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${xmlEscape(post.url)}</link>
      <guid isPermaLink="false">${xmlEscape(post.guid)}</guid>
      <pubDate>${xmlEscape(pubDate)}</pubDate>
      <description>${xmlEscape(post.description)}</description>
    </item>`
      })
      .join('')}
  </channel>
</rss>
`
}

export default blogsController
