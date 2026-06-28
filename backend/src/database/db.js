import pg from 'pg'
import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

console.log(`[db] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`)
console.log(`[db] Environment: ${isProduction ? 'production' : 'development'}`)

if (!process.env.DATABASE_URL) {
  console.error('[db] FATAL: DATABASE_URL environment variable is not set.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
  // Timeouts para evitar conexões penduradas
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client:', err.message)
})

console.log('[db] Database: PostgreSQL')

const db = {
  pool,
  /** Executa uma query e retorna o resultado completo do pg */
  query: (text, params) => pool.query(text, params),
  /** Retorna um cliente do pool (lembre de chamar client.release() no finally) */
  getClient: () => pool.connect(),
}

export default db
