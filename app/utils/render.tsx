import type { RemixNode } from 'remix/ui'
import { renderToStream } from 'remix/ui/server'

import { router } from '../router.ts'
import { routes } from '../routes.ts'

export function render(node: RemixNode, request: Request, init?: ResponseInit) {
  let stream = renderToStream(node, {
    frameSrc: request.url,
    async resolveClientEntry(entryId, component) {
      let [rawId, explicitExportName] = entryId.split('#')
      let exportName = explicitExportName || component.name
      if (!exportName) {
        throw new Error(`Unable to resolve client entry export for ${entryId}`)
      }

      if (rawId.startsWith('file:')) {
        let absPath = decodeURIComponent(new URL(rawId).pathname)
        let relativePath = absPath.replace(`${process.cwd()}/`, '')
        if (relativePath === absPath || relativePath.startsWith('..')) {
          throw new Error(`Client entry is outside workspace: ${entryId}`)
        }
        return { href: routes.assets.href({ path: relativePath }), exportName }
      }

      // Back-compat for existing client entries using /assets/ as the ID.
      if (rawId.startsWith('/assets/')) {
        return { href: rawId, exportName }
      }

      throw new Error(`Unsupported client entry id: ${entryId}`)
    },
    async resolveFrame(src, target) {
      let headers = new Headers({ accept: 'text/html' })
      let cookie = request.headers.get('cookie')
      if (cookie) headers.set('cookie', cookie)
      if (target) headers.set('x-remix-target', target)

      let response = await router.fetch(new Request(new URL(src, request.url), { headers }))
      return response.body ?? response.text()
    },
  })

  let headers = new Headers(init?.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'text/html; charset=utf-8')
  }

  return new Response(stream, { ...init, headers })
}
