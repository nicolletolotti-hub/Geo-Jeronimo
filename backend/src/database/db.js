import 'dotenv/config'
import fs from 'fs'

let db

const dbUrl = process.env.DATABASE_URL
const dbHost = process.env.DB_HOST
console.log('[db] DATABASE_URL:', dbUrl ? `set (${dbUrl.slice(0, 20)}...)` : 'NOT SET')

if (dbUrl || dbHost) {
  // PostgreSQL (cloud: Railway, Supabase, etc.)
  const pg = await import('pg')
  const { Pool } = pg.default || pg

  function parseConnectionString(str) {
    const url = new URL(str)
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.replace(/^\//, ''),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
    }
  }

  function getPoolConfig() {
    if (dbUrl) {
      const c = parseConnectionString(dbUrl)
      return { host: c.host, port: c.port, database: c.database, user: c.user, password: c.password, ssl: { rejectUnauthorized: false } }
    }
    const isLocal = dbHost === 'localhost'
    return {
      host: dbHost, port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'geojeronimo',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } })
    }
  }

  const pool = new Pool({ ...getPoolConfig(), max: 5, idleTimeoutMillis: 5000, connectionTimeoutMillis: 10000 })

  pool.on('connect', () => console.log('Connected to PostgreSQL database'))
  pool.on('error', (err) => console.error('PostgreSQL error:', err.message))

  db = {
    type: 'pg',
    pool,
    // unified interface used by helpers
    all: async (sql, params) => { const r = await pool.query(sql, params); return r.rows },
    get: async (sql, params) => { const r = await pool.query(sql, params); return r.rows[0] || null },
    run: async (sql, params) => { const r = await pool.query(sql, params); return { lastID: r.rows[0]?.id ?? null, changes: r.rowCount } },
    exec: async (sql) => {
      const statements = sql.split(';').filter(s => s.trim().length > 0)
      for (const stmt of statements) {
        await pool.query(stmt)
      }
    },
    close: () => pool.end(),
  }

  console.log('Database: PostgreSQL')
} else {
  // SQLite (local development)
  const path = await import('path')
  const { fileURLToPath } = await import('url')
  const Database = (await import('better-sqlite3')).default

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.default.dirname(__filename)
  const dbDir = path.default.join(__dirname, '../../../data')
  const dbPath = path.default.join(dbDir, 'geojeronimo.db')

  try { fs.mkdirSync(dbDir, { recursive: true }) } catch {}

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  db = {
    type: 'sqlite',
    sqlite,
    all: (sql, params) => sqlite.prepare(sql).all(...params),
    get: (sql, params) => sqlite.prepare(sql).get(...params) || null,
    run: (sql, params) => { const info = sqlite.prepare(sql).run(...params); return { lastID: Number(info.lastInsertRowid), changes: info.changes } },
    exec: (sql) => sqlite.exec(sql),
    close: () => sqlite.close(),
  }

  console.log(`Database: SQLite (${dbPath})`)
}

export default db
