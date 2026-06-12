import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'geojeronimo',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Xuxu1969.',
})

export default pool
