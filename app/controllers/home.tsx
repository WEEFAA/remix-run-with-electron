import type { BuildAction } from 'remix/fetch-router'

import type { BlogPost } from '../data/blogs.server.ts'
import { blogRepository } from '../data/blogRepository.server.ts'
import { routes } from '../routes.ts'
import { Layout } from '../ui/layout.tsx'
import { render } from '../utils/render.tsx'

export const home: BuildAction<'GET', typeof routes.home> = {
  async handler({ request, url }) {
    let query = url.searchParams.get('q') ?? ''
    let recentPosts = (await blogRepository.listPosts({ query })).slice(0, 5)
    let Page = createLandingPage({ recentPosts, query })
    return render(<Page />, request)
  },
}

function createLandingPage(props: { recentPosts: BlogPost[]; query: string }) {
  return function LandingPage() {
    return () => (
      <Layout title="Electron Remix Blog">
        <h1>Electron Remix Blog</h1>
        <p>
          A simple blog powered by Remix v3 route controllers and your Electron fetch adapter.
        </p>
        <p>
          <a href={routes.blogs.index.href()}>Read all blogs</a> ·{' '}
          <a href={routes.blogs.rss.href()}>RSS feed</a>
        </p>
        <form method="get" action={routes.blogs.index.href()}>
          <label>
            Search titles: <input type="text" name="q" value={props.query} />
          </label>{' '}
          <button type="submit">Search</button>
        </form>

        <h2>Recent posts</h2>
        {props.recentPosts.length === 0 ? <p>No posts match your search.</p> : null}
        <ul>
          {props.recentPosts.map((post) => (
            <li key={post.id}>
              <a href={routes.blogs.show.href({ id: post.id })}>{post.title}</a> - {post.excerpt}
            </li>
          ))}
        </ul>
      </Layout>
    )
  }
}
