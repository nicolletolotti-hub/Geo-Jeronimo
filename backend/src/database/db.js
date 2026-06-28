import pg from 'pg'
import 'dotenv/config'

const isProduction = process.env.NODE_ENV === 'production'

console.log(`[db] PG_URL/DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'NOT SET'}`)
console.log(`[db] Environment: ${isProduction ? 'production' : 'development'}`)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Em produção (Railway, Vercel, etc.), SSL é geralmente necessário.
  // Em desenvolvimento local (Docker), não usamos SSL.
  ssl: isProduction ? { rejectUnauthorized: false } : false,
})

pool.on('error', (err) => {
  console.error('[db] Unexpected error on idle client', err)
  // Não saia do processo, apenas registre o erro.
})

console.log(`[db] Database: PostgreSQL`)

export default {
  pool,
  // Função helper para executar queries
  query: (text, params) => pool.query(text, params),
  // Função para obter um cliente do pool
  getClient: () => pool.connect(),
}