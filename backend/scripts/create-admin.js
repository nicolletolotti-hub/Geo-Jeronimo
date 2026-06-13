import 'dotenv/config'
import bcrypt from 'bcryptjs'
import pool from '../src/database/db.js'

async function createAdmin() {
  const email = process.argv[2] || 'admin@geojeronimo.com'
  const password = process.argv[3] || 'admin123'
  const name = process.argv[4] || 'Administrador'

  const hashedPassword = await bcrypt.hash(password, 10)

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    await pool.query('UPDATE users SET role = $1, password = $2 WHERE email = $3', ['admin', hashedPassword, email])
    console.log(`Usuário ${email} promovido a admin`)
  } else {
    await pool.query(
      `INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, 'admin')`,
      [email, hashedPassword, name]
    )
    console.log(`Admin criado: ${email} / ${password}`)
  }

  await pool.end()
  process.exit(0)
}

createAdmin().catch(err => {
  console.error('Erro:', err.message)
  process.exit(1)
})
