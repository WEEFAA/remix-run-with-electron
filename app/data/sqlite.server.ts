import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

let _sqlite: DatabaseSync | null = null
let _db: ReturnType<typeof drizzle> | null = null

export function getSqliteFilePath() {
  return process.env.BLOG_DB_PATH ?? path.resolve(process.cwd(), 'db', 'blog.sqlite')
}

export async function getSqliteConnection() {
  if (_sqlite) return _sqlite

  let filePath = getSqliteFilePath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })

  _sqlite = new DatabaseSync(filePath)
  _sqlite.exec('PRAGMA foreign_keys = ON;')
  _sqlite.exec('PRAGMA journal_mode = WAL;')
  return _sqlite
}

export async function getDrizzleDb() {
  if (_db) return _db
  let sqlite = await getSqliteConnection()

  _db = drizzle(async (sql, params, method) => {
    let stmt = sqlite.prepare(sql)
    let bound = Array.isArray(params) ? params : []

    switch (method) {
      case 'run': {
        stmt.run(...bound)
        return { rows: [] }
      }
      case 'get': {
        stmt.setReturnArrays(true)
        let row = stmt.get(...bound)
        return { rows: row ? [row] : [] }
      }
      case 'all': {
        stmt.setReturnArrays(true)
        let rows = stmt.all(...bound)
        return { rows }
      }
      case 'values': {
        // node:sqlite doesn't expose `.values()`, but can return array-mode rows.
        stmt.setReturnArrays(true)
        let rows = stmt.all(...bound)
        return { rows }
      }
      default: {
        throw new Error(`Unsupported sqlite-proxy method: ${method}`)
      }
    }
  })

  return _db
}

