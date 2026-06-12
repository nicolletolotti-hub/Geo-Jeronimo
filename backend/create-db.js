import pg from 'pg'

const { Client } = pg

async function createDatabase() {
  const password = process.env.DB_PASSWORD || 'Xuxu1969.'
  console.log('DB_PASSWORD:', password ? '*** (configured)' : 'NOT CONFIGURED')
  
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: password,
    database: 'postgres' // Connect to default database first
  })

  try {
    await client.connect()
    console.log('Conectado ao PostgreSQL')

    // Check if database exists
    const checkDb = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'geojeronimo'"
    )

    if (checkDb.rows.length > 0) {
      console.log('Banco de dados geojeronimo já existe')
    } else {
      // Create database
      await client.query('CREATE DATABASE geojeronimo')
      console.log('Banco de dados geojeronimo criado com sucesso')
    }

    await client.end()
    process.exit(0)
  } catch (error) {
    console.error('Erro ao criar banco de dados:', error.message)
    await client.end()
    process.exit(1)
  }
}

createDatabase()
