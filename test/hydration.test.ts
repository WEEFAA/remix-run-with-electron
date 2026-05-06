import assert from 'assert'
import test from 'node:test'

import { router } from '../app/router.ts'

test('serves Remix client entry module from /assets', async () => {
  let response = await router.fetch(new Request('http://localhost/assets/app/assets/entry.ts'))
  assert.equal(response.status, 200)

  let contentType = response.headers.get('content-type') ?? ''
  assert.ok(
    contentType.includes('javascript') || contentType.includes('text/plain'),
    `expected JS-ish content-type, got ${contentType}`,
  )

  let body = await response.text()
  assert.ok(body.includes('run('), 'expected bundled entry to include run(...) call')
})

test('home HTML includes module script bootstrapping run()', async () => {
  let response = await router.fetch(new Request('http://localhost/'))
  assert.equal(response.status, 200)

  let html = await response.text()
  assert.ok(
    html.includes('<script type="module"') && html.includes('/assets/app/assets/entry.ts'),
    'expected HTML to include module script for /assets/app/assets/entry.ts',
  )
})

