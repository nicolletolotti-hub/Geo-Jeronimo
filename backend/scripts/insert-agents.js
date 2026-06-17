import bcrypt from 'bcryptjs'
import db from '../src/database/db.js'
import { runRun, runGet } from '../src/database/helpers.js'

const agents = [
  { name: 'Luana', email: 'luhmenezes661@gmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Karine', email: 'menezeskariine23@gmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Simone', email: 'si_fsilva@hotmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Leila', email: 'leilablisboa@gmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Carla', email: 'carladuczinski@hotmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Milene', email: 'milene.dellanina@gmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Silvia', email: 'silviacsvargas@gmail.com', phone: '', agent_area: 'Centro' },
  { name: 'Eduarda', email: 'costabotelhoe@gmail.com', phone: '', agent_area: 'Centro' },
]

async function main() {
  const hashedPassword = await bcrypt.hash('acs123', 10)

  for (const a of agents) {
    const existing = await runGet(db, 'SELECT id FROM users WHERE email = $1', [a.email])
    if (existing) {
      console.log(`Já existe: ${a.name} (${a.email})`)
      continue
    }

    await runRun(
      db,
      `INSERT INTO users (email, password, name, role, phone, agent_area, agent_status)
       VALUES ($1, $2, $3, 'agent', $4, $5, 'approved')`,
      [a.email, hashedPassword, a.name, a.phone || '', a.agent_area]
    )
    console.log(`Criado: ${a.name} (${a.email})`)
  }

  console.log('\nTodos os ACS foram inseridos!')
  console.log('Senha temporária para todos: acs123')
  console.log('Eles podem alterar a senha após o login em /profile')
  db.close()
}

main().catch(err => {
  console.error('Erro:', err)
  db.close()
})
