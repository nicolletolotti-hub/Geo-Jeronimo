import 'dotenv/config'
import bcrypt from 'bcryptjs'
import db from './db.js'

async function seedAdmin() {
  const client = await db.getClient();
  try {
    console.log('[seed] Conectado. Verificando/criando usuário administrador...');

    const adminCpf = process.env.ADMIN_CPF;
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminCpf || !adminEmail || !adminPassword) {
      console.warn('[seed] Variáveis ADMIN_CPF, ADMIN_EMAIL e ADMIN_PASSWORD são necessárias no .env para criar o admin. Pulando.');
      return;
    }

    const { rows: existingRows } = await client.query('SELECT id FROM users WHERE cpf = $1 OR email = $2', [adminCpf, adminEmail]);

    if (existingRows.length > 0) {
      console.log('[seed] Usuário administrador já existe. Nenhuma ação necessária.');
      return;
    }

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await client.query(
      `INSERT INTO users (cpf, email, password, name, role, profile, agent_status)
       VALUES ($1, $2, $3, $4, 'admin', 'ADMIN', 'approved')`,
      [adminCpf, adminEmail, hashedPassword, 'Administrador']
    );

    console.log('[seed] Usuário administrador criado com sucesso!');

  } catch (error) {
    console.error('[seed] Erro ao criar usuário administrador:', error.message);
  } finally {
    client.release();
  }
}

async function runSeed() {
    await seedAdmin();
    // No futuro, outras funções de seed podem ser chamadas aqui.
    console.log('[seed] Processo de seeding finalizado. Desconectando...');
    await db.pool.end(); // Fecha todas as conexões do pool
}

runSeed();
