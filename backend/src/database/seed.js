import bcrypt from 'bcryptjs'
import db from './db.js'

/**
 * Cria o usuário administrador padrão se não existir.
 * Exportada para ser chamada pelo server.js na startup.
 */
export async function seedDatabase() {
  const adminCpf      = process.env.ADMIN_CPF
  const adminEmail    = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminCpf || !adminEmail || !adminPassword) {
    console.log('[seed] ADMIN_CPF/ADMIN_EMAIL/ADMIN_PASSWORD não definidos — pulando.')
    return
  }

  const cleanCpf = adminCpf.replace(/\D/g, '')
  const { rows } = await db.query('SELECT id FROM users WHERE cpf=$1 OR email=$2', [cleanCpf, adminEmail])
  if (rows.length > 0) {
    console.log('[seed] Admin já existe.')
    return
  }

  const hashed = await bcrypt.hash(adminPassword, 10)
  await db.query(
    `INSERT INTO users (cpf,email,password,name,role,profile,agent_status) VALUES ($1,$2,$3,$4,'admin','ADMIN','approved')`,
    [cleanCpf, adminEmail, hashed, 'Administrador']
  )
  console.log('[seed] Admin criado com sucesso.')
}

// Execução direta: node src/database/seed.js
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const { default: dotenv } = await import('dotenv/config')
  try {
    await seedDatabase()
  } catch (err) {
    console.error('[seed] Erro:', err.message)
  } finally {
    await db.pool.end()
  }
}
