import type { RemixNode } from 'remix/ui'

import { routes } from '../routes.ts'
import { Document } from './document.tsx'

export interface LayoutProps {
  children?: RemixNode
  title?: string
}

export function Layout() {
  return ({ title, children }: LayoutProps) => (
    <Document title={title}>
      <div class="appShell">
        <header class="topbar">
          <nav class="nav" aria-label="Primary">
            <a class="brand" href={routes.home.href()}>
              Electron Remix Blog
            </a>
            <div class="navLinks">
              <a href={routes.home.href()}>Home</a>
              <a href={routes.blogs.index.href()}>Blogs</a>
              <a href={routes.blogs.new.href()}>Write</a>
            </div>
          </nav>
        </header>

        <main class="container">{children}</main>

        <footer class="footer">
          <div class="container">
            <div class="muted">
              Minimal local blog running in Electron with Remix v3.
            </div>
          </div>
        </footer>
      </div>
    </Document>
  )
}
