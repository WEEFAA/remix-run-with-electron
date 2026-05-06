import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import * as esbuild from 'esbuild'

const ASSETS_PREFIX = '/assets/'

function isAllowedAssetPath(filePath: string) {
  // Keep this small and explicit. Expand later when you add more hydrated UI.
  if (filePath.startsWith('app/assets/')) return true
  if (filePath.startsWith('app/ui/')) return true
  if (filePath.startsWith('node_modules/')) return true
  return false
}

function contentTypeFor(filePath: string) {
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  return 'application/javascript; charset=utf-8'
}

async function buildScript(absPath: string) {
  let result = await esbuild.build({
    entryPoints: [absPath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    sourcemap: process.env.NODE_ENV === 'development' ? 'inline' : false,
    target: ['chrome120'],
    jsx: 'automatic',
    jsxImportSource: 'remix/ui',
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    },
    loader: {
      '.ts': 'ts',
      '.tsx': 'tsx',
      '.js': 'js',
      '.jsx': 'jsx',
      '.css': 'css',
    },
    logLevel: 'silent',
  })

  let output = result.outputFiles?.[0]
  if (!output) {
    throw new Error('Asset build produced no output')
  }
  return output.text
}

export const assets = {
  async fetch(request: Request): Promise<Response | null> {
    let url = new URL(request.url)
    if (!url.pathname.startsWith(ASSETS_PREFIX)) return null
    if (request.method !== 'GET' && request.method !== 'HEAD') return null

    let relativePath = url.pathname.slice(ASSETS_PREFIX.length)
    relativePath = decodeURIComponent(relativePath).replace(/^\/+/, '')

    // Basic traversal protection.
    if (relativePath.includes('..')) {
      return new Response('Not Found', { status: 404 })
    }

    if (!isAllowedAssetPath(relativePath)) {
      return new Response('Not Found', { status: 404 })
    }

    let absPath = path.resolve(process.cwd(), relativePath)

    try {
      // Ensure it exists; build/serve from disk.
      await fs.stat(absPath)
    } catch {
      return new Response('Not Found', { status: 404 })
    }

    let body: string
    try {
      if (absPath.endsWith('.css')) {
        body = await fs.readFile(absPath, 'utf8')
      } else {
        body = await buildScript(absPath)
      }
    } catch (error) {
      console.error('Asset build error:', error)
      return new Response('Internal Server Error', { status: 500 })
    }

    return new Response(request.method === 'HEAD' ? null : body, {
      headers: {
        'Content-Type': contentTypeFor(absPath),
        'Cache-Control': 'no-store',
      },
    })
  },
}
