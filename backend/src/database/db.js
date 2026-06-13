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

let pool
const dbUrl = process.env.DATABASE_URL

if (dbUrl) {
  const config = parseConnectionString(dbUrl)
  pool = new Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  })
} else {
  const isLocal = !process.env.DB_HOST || process.env.DB_HOST === 'localhost'
  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'geojeronimo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
    max: 5,
    idleTimeoutMillis: 5000,
    connectionTimeoutMillis: 5000,
  })
}

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export default pool
