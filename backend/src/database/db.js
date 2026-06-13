import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const isLocal = process.env.DB_HOST === 'localhost' || !process.env.DB_HOST
const required = ['DB_HOST', 'DB_PASSWORD', 'DB_NAME', 'DB_USER']
for (const key of required) {
  if (!process.env[key]) {
    console.warn(`WARNING: ${key} environment variable not set. Using fallback.`)
  }
}

const pool = new Pool({
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

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err)
})

export default pool
