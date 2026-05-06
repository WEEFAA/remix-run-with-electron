import {
  createRouter,
  type AnyParams,
  type MiddlewareContext,
  type WithParams,
} from 'remix/fetch-router'

import { assets } from './assets.ts'
import { home } from './controllers/home.tsx'
import blogsController from './controllers/blogs.tsx'
import { routes } from './routes.ts'

export type RootMiddleware = []
export type AppContext<params extends AnyParams = AnyParams> = WithParams<
  MiddlewareContext<RootMiddleware>,
  params
>

export const router = createRouter()

router.get(routes.assets, async ({ request }) => {
  let response = await assets.fetch(request)
  return response ?? new Response('Not Found', { status: 404 })
})

router.map(routes.home, home)
router.map(routes.blogs, blogsController)
