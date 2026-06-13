import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

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
  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    const c = parseConnectionString(dbUrl)
    return { host: c.host, port: c.port, database: c.database, user: c.user, password: c.password, ssl: { rejectUnauthorized: false } }
  }

  const host = process.env.DB_HOST
  if (host) {
    const isLocal = host === 'localhost'
    return { host, port: parseInt(process.env.DB_PORT) || 5432, database: process.env.DB_NAME || 'geojeronimo', user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) }
  }

  if (process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_PUBLIC_DOMAIN) {
    return { host: 'postgres.railway.internal', port: 5432, database: 'railway', user: 'postgres', password: 'AZnvQqTpbYguKuEayKmpemYVDWJKFHXn', ssl: { rejectUnauthorized: false } }
  }

  return { host: 'localhost', port: 5432, database: 'geojeronimo', user: 'postgres', password: '', ssl: false }
}

const pool = new Pool({ ...getPoolConfig(), max: 5, idleTimeoutMillis: 5000, connectionTimeoutMillis: 5000 })

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export default pool
