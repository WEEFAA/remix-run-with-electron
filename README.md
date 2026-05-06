# Sample Electron App with Remix V3

A minimal Electron + Remix v3 app that implements a simple **blog + RSS**.

## Starter Shape

- `app/controllers/home.tsx` owns the home page.
- `app/controllers/blogs.tsx` owns `/blogs` pages + RSS.
- `app/routes.ts` defines the route contract.
- `app/router.ts` wires routes to handlers.
- `app/ui/` holds the shared document and layout wrappers.
- `app/utils/render.tsx` centralizes HTML response rendering.
- `app/data/` holds the SQLite + repository code.

## Growing The App

- Start with flat route files and only introduce route folders when a route needs multiple actions or route-owned modules.
- Add directories like `app/data/`, `app/middleware/`, `public/`, or `test/` when the app actually needs them.
- Move shared UI into `app/ui/` once more than one route needs it.

## Routes

- `/` landing page (includes search form)
- `/blogs` list + search (`?q=...`)
- `/blogs/new` guest post form
- `POST /blogs` create new post
- `/blogs/:id` read post
- `/blogs/rss.xml` RSS feed

## Data (SQLite)

This app stores blog posts in SQLite using **Drizzle ORM**.

- SQLite driver: **Node built-in `node:sqlite`** (no native addon rebuilds)
- DB path: `BLOG_DB_PATH` (optional), defaults to `./db/blog.sqlite`

Before running the app the first time, initialize the DB:

```sh
npm run seed
```

## Commands

```sh
npm i
npm run seed
npm run dev
npm test
npm run typecheck
```

### Notes

- If Electron APIs like `protocol` are `undefined`, you likely have `ELECTRON_RUN_AS_NODE=1` set in your shell. Run:

```sh
unset ELECTRON_RUN_AS_NODE
```
