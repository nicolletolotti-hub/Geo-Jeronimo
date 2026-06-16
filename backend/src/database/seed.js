import bcrypt from 'bcryptjs'
import db from './db.js'
import { runGet, runRun, runQuery } from './helpers.js'

const DATA_INICIO = new Date(Date.now() - 7 * 24 * 3600000)

function gerarNiveisRio() {
  const niveis = []
  for (let i = 0; i < 72; i++) {
    const t = new Date(DATA_INICIO.getTime() + i * 3600000)
    const base = 0.8 + Math.random() * 0.3
    const variacao = Math.sin(i / 12) * 0.15
    niveis.push({ level: parseFloat((base + variacao).toFixed(2)), timestamp: t.toISOString(), source: 'seed' })
  }
  return niveis
}

const RESIDENCIAS_EXEMPLO = [
  { address: 'Rua Cel. Augusto Pereira', house_number: '45', neighborhood: 'Cidade Baixa', residents: 4, has_elderly: true, flood_level: 3.5, evacuation_level: 5.0, latitude: -29.968, longitude: -51.720, evacuation_logistics: 'vehicle', shelter_plan: 'public_shelter' },
  { address: 'Rua Dr. Roque', house_number: '120', neighborhood: 'Cidade Baixa', residents: 2, has_children: true, flood_level: 4.0, evacuation_level: 5.5, latitude: -29.967, longitude: -51.722, evacuation_logistics: 'boat', shelter_plan: 'relatives' },
  { address: 'Rua Setembrino', house_number: '300', neighborhood: 'Centro', residents: 3, has_disabled: true, flood_level: 5.5, evacuation_level: 7.0, latitude: -29.962, longitude: -51.727, evacuation_logistics: 'vehicle', shelter_plan: 'public_shelter', comorbidade_mobilidade: true },
  { address: 'Rua Júlio de Castilhos', house_number: '88', neighborhood: 'Centro', residents: 5, has_elderly: true, has_children: true, flood_level: 6.0, evacuation_level: 7.5, latitude: -29.960, longitude: -51.725, evacuation_logistics: 'vehicle', shelter_plan: 'public_shelter', comorbidade_diabetes: true, comorbidade_cardiaca: true },
  { address: 'Rua 1', house_number: '15', neighborhood: 'Fátima', residents: 3, has_children: true, flood_level: 4.5, evacuation_level: 6.0, latitude: -29.970, longitude: -51.715, evacuation_logistics: 'truck', shelter_plan: 'hotel' },
  { address: 'Av. B', house_number: '200', neighborhood: 'Fátima', residents: 6, flood_level: 5.0, evacuation_level: 6.5, latitude: -29.972, longitude: -51.713, evacuation_logistics: 'vehicle', shelter_plan: 'public_shelter', possui_animais_grande_porte: true },
  { address: 'Rua Principal', house_number: '1', neighborhood: 'Bandeira Branca', residents: 2, has_elderly: true, flood_level: 3.0, evacuation_level: 4.5, latitude: -29.958, longitude: -51.730, evacuation_logistics: 'vehicle', shelter_plan: 'relatives' },
  { address: 'Estrada Porto do Conde', house_number: 'Km 5', neighborhood: 'Porto do Conde', residents: 4, has_children: true, flood_level: 2.5, evacuation_level: 4.0, latitude: -29.955, longitude: -51.740, evacuation_logistics: 'boat', shelter_plan: 'public_shelter', possui_veiculo: false, necessita_energia: true },
  { address: 'Rua da Figueira', house_number: '33', neighborhood: 'Passo da Cruz', residents: 3, flood_level: 4.0, evacuation_level: 5.5, latitude: -29.975, longitude: -51.710, evacuation_logistics: 'vehicle', shelter_plan: 'relatives' },
  { address: 'Rua Bela Vista', house_number: '10', neighborhood: 'Bela Vista', residents: 2, has_elderly: true, flood_level: 6.5, evacuation_level: 8.0, latitude: -29.965, longitude: -51.735, evacuation_logistics: 'vehicle', shelter_plan: 'hotel', comorbidade_respiratoria: true },
]

const ABRIGOS_EXEMPLO = [
  { name: 'Ginásio Municipal', address: 'Rua Venâncio Aires, s/n', latitude: -29.960, longitude: -51.723, capacity: 300, type: 'shelter', contact: '(51) 99999-0001' },
  { name: 'Escola Estadual São Jerônimo', address: 'Rua Pinheiro Machado, 150', latitude: -29.958, longitude: -51.726, capacity: 200, type: 'shelter', contact: '(51) 99999-0002' },
  { name: 'Igreja Matriz São Jerônimo', address: 'Praça Central, s/n', latitude: -29.963, longitude: -51.724, capacity: 100, type: 'shelter', contact: '(51) 99999-0003' },
  { name: 'Ponto de Encontro - Prefeitura', address: 'Rua Cel. Joaquim Pedro, 100', latitude: -29.961, longitude: -51.725, capacity: 0, type: 'meeting_point', contact: '(51) 99999-0004' },
  { name: 'Abrigo Passo D\'Areia', address: 'Estrada Passo D\'Areia, s/n', latitude: -29.950, longitude: -51.745, capacity: 80, type: 'shelter', contact: '(51) 99999-0005' },
]

const ROTAS_EXEMPLO = [
  { name: 'Rota Centro → Ginásio Municipal', description: 'Sair pela Rua Venâncio Aires até o Ginásio Municipal', geojson_data: { type: 'LineString', coordinates: [[-51.725, -29.962], [-51.723, -29.960]] } },
  { name: 'Rota Cidade Baixa → Igreja Matriz', description: 'Subir pela Rua Cel. Augusto Pereira até a Praça Central', geojson_data: { type: 'LineString', coordinates: [[-51.720, -29.968], [-51.724, -29.963]] } },
  { name: 'Rota Bandeira Branca → Escola Estadual', description: 'Seguir pela Rua Principal até a Pinheiro Machado', geojson_data: { type: 'LineString', coordinates: [[-51.730, -29.958], [-51.726, -29.958]] } },
]

export async function seedDatabase() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@geojeronimo.com'
    const adminPassword = process.env.ADMIN_PASSWORD
    const existingAdmin = await runGet(db, 'SELECT id FROM users WHERE email = $1', [adminEmail])
    if (!existingAdmin && adminPassword) {
      const hashed = await bcrypt.hash(adminPassword, 10)
      const r = await runRun(db, `INSERT INTO users (email, password, name, role, agent_status) VALUES ($1, $2, $3, 'admin', 'approved') RETURNING id`, [adminEmail, hashed, 'Administrador'])
      console.log('[seed] Admin criado:', adminEmail)
      const adminId = r.lastID
      for (const res of RESIDENCIAS_EXEMPLO) {
        await runRun(db, `INSERT INTO residences (user_id, address, house_number, neighborhood, residents, has_elderly, has_children, has_disabled, flood_level, evacuation_level, latitude, longitude, evacuation_logistics, shelter_plan, comorbidade_mobilidade, comorbidade_diabetes, comorbidade_cardiaca, comorbidade_respiratoria, possui_animais_grande_porte, possui_veiculo, necessita_energia) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
          [adminId, res.address, res.house_number, res.neighborhood, res.residents, res.has_elderly || false, res.has_children || false, res.has_disabled || false, res.flood_level, res.evacuation_level, res.latitude, res.longitude, res.evacuation_logistics, res.shelter_plan, res.comorbidade_mobilidade || false, res.comorbidade_diabetes || false, res.comorbidade_cardiaca || false, res.comorbidade_respiratoria || false, res.possui_animais_grande_porte || false, res.possui_veiculo !== false, res.necessita_energia || false])
      }
      console.log('[seed]', RESIDENCIAS_EXEMPLO.length, 'residências de exemplo criadas')
      for (const s of ABRIGOS_EXEMPLO) {
        await runRun(db, `INSERT INTO shelters (name, address, latitude, longitude, capacity, type, contact) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [s.name, s.address, s.latitude, s.longitude, s.capacity, s.type, s.contact])
      }
      console.log('[seed]', ABRIGOS_EXEMPLO.length, 'abrigos de exemplo criados')
      for (const r of ROTAS_EXEMPLO) {
        await runRun(db, 'INSERT INTO evacuation_routes (name, description, geojson_data) VALUES ($1,$2,$3)', [r.name, r.description, JSON.stringify(r.geojson_data)])
      }
      console.log('[seed]', ROTAS_EXEMPLO.length, 'rotas de evacuação de exemplo criadas')
      const niveis = gerarNiveisRio()
      for (const n of niveis) {
        await runRun(db, 'INSERT INTO river_levels (level, timestamp, source) VALUES ($1,$2,$3)', [n.level, n.timestamp, n.source])
      }
      console.log('[seed]', niveis.length, 'registros de nível do rio criados')
      await runRun(db, `INSERT INTO alerts (type, title, message, source) VALUES ('info','Sistema operacional','GeoJeronimo está operacional. Monitoramento ativo 24h.','system')`)
      console.log('[seed] Alerta inicial criado')
      console.log('[seed] Database seeded successfully')
    } else if (existingAdmin) {
      console.log('[seed] Admin já existe, pulando seed')
    } else {
      console.log('[seed] ADMIN_PASSWORD não configurada, pulando seed')
    }
  } catch (err) {
    console.error('[seed] Error:', err.message)
  }
}
