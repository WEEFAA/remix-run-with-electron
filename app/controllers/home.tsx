import type { BuildAction } from 'remix/fetch-router'

import type { BlogPost } from '../data/blogs.server.ts'
import { blogRepository } from '../data/blogRepository.server.ts'
import { routes } from '../routes.ts'
import { ParrotScene } from '../ui/parrot-scene.tsx'
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
        <ParrotScene modelUrl={routes.assets.href({ path: 'app/assets/Parrot.glb' })} />
        <p>
          <span class="pill">Local-first</span>
        </p>
        <div class="stack">
          <h1>Electron Remix Blog</h1>
          <p class="muted">
            A small, readable blog UI. Server-rendered pages, route-first controllers, and a local
            repository.
          </p>

          <div class="card">
            <div class="cardPad stack">
              <h2>Search</h2>
              <form method="get" action={routes.blogs.index.href()}>
                <label>
                  Search titles
                  <input
                    key={`q:${props.query || 'empty'}`}
                    type="text"
                    name="q"
                    value={props.query}
                  />
                </label>
                <div class="buttonRow" style={{ marginTop: 12 }}>
                  <button type="submit">Search</button>
                  <a class="pill" href={routes.blogs.index.href()}>
                    Browse all posts
                  </a>
                  <a class="pill" href={routes.blogs.new.href()}>
                    Write a post
                  </a>
                </div>
              </form>
            </div>
          </div>

          <h2>Recent posts</h2>
          {props.recentPosts.length === 0 ? <p class="muted">No posts match your search.</p> : null}
          <ul class="postList">
            {props.recentPosts.map((post) => (
              <li key={post.id} class="card">
                <div class="cardPad stack">
                  <div class="postMeta">
                    <a href={routes.blogs.show.href({ id: post.id })}>
                      <strong>{post.title}</strong>
                    </a>
                    <span class="muted" style={{ fontSize: 13 }}>
                      {new Date(post.publishedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
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
