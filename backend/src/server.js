import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import path from 'path'
import cron from 'node-cron'
import { fileURLToPath } from 'url'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

import bcrypt from 'bcryptjs'
import db from './database/db.js'
import { runQuery, runGet, runRun } from './database/helpers.js'
import authRoutes from './routes/auth.js'
import riverRoutes from './routes/river.js'
import weatherRoutes from './routes/weather.js'
import residenceRoutes from './routes/residence.js'
import alertRoutes from './routes/alerts.js'
import stationRoutes from './routes/stations.js'
import shelterRoutes from './routes/shelters.js'
import autoAlertRoutes from './routes/autoalerts.js'
import importRoutes from './routes/import.js'
import rainfallRoutes from './routes/rainfall.js'
import evacuationRoutes from './routes/evacuation.js'
import floodRoutes from './routes/flood.js'
import microareasRoutes from './routes/microareas.js'
import petRoutes from './routes/pets.js'
import belongingsRoutes from './routes/belongings.js'
import adminRoutes from './routes/admin.js'
import { fetchDefesaCivilData } from './utils/defesaCivilApi.js'
import { seedDatabase } from './database/seed.js'
import { createLogger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const { log: logError } = createLogger('server-error.log')

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'unsafe-none' },
}))

app.use(compression())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false
})
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://geojeronimo-v4.vercel.app',
    'https://geosaojeronimo.vercel.app',
    'https://geo-jeronimo-production.up.railway.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use('/api/', limiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.use('/data', express.static(path.join(__dirname, '../../data')))

app.use('/api/auth', authRoutes)
app.use('/api/river', riverRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/residence', residenceRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/stations', stationRoutes)
app.use('/api/shelters', shelterRoutes)
app.use('/api/auto-alerts', autoAlertRoutes)
app.use('/api/import', importRoutes)
app.use('/api/rainfall', rainfallRoutes)
app.use('/api/evacuation-routes', evacuationRoutes)
app.use('/api/flood', floodRoutes)
app.use('/api/microareas', microareasRoutes)
app.use('/api/pets', petRoutes)
app.use('/api/belongings', belongingsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use((err, req, res, next) => {
  logError(`ERROR: ${err.stack || err.message}`)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' })
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Validação falhou', details: err.message })
  }
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Não autorizado' })
  }
  if (err.status === 404) {
    return res.status(404).json({ error: 'Recurso não encontrado' })
  }
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development'
      ? err.message
      : 'Erro interno do servidor'
  })
})

async function runMigrations() {
  try {
    const isSqlite = db.type === 'sqlite'

    if (isSqlite) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, cpf TEXT UNIQUE, email TEXT, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','superadmin','agent')), profile TEXT DEFAULT 'CIDADAO' CHECK (profile IN ('CIDADAO','ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO')), agent_area TEXT, agent_status TEXT DEFAULT 'pending', approved_profiles TEXT DEFAULT '[]', approved_by INTEGER REFERENCES users(id), approved_at TEXT, phone TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS residences (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, address TEXT NOT NULL, neighborhood TEXT NOT NULL, residents INTEGER NOT NULL, comorbidities TEXT, has_elderly INTEGER DEFAULT 0, has_children INTEGER DEFAULT 0, has_pregnant INTEGER DEFAULT 0, has_disabled INTEGER DEFAULT 0, telefone_contato TEXT, telefone_emergencia TEXT, possui_veiculo INTEGER DEFAULT 0, possui_animais_grande_porte INTEGER DEFAULT 0, acesso_superior INTEGER DEFAULT 0, medicamentos_continuos TEXT, necessita_energia INTEGER DEFAULT 0, abrigo_preferencial TEXT, pontos_referencia TEXT, comorbidade_respiratoria INTEGER DEFAULT 0, comorbidade_cardiaca INTEGER DEFAULT 0, comorbidade_diabetes INTEGER DEFAULT 0, comorbidade_renal INTEGER DEFAULT 0, comorbidade_neurologica INTEGER DEFAULT 0, comorbidade_mobilidade INTEGER DEFAULT 0, comorbidade_saude_mental INTEGER DEFAULT 0, comorbidade_alergias INTEGER DEFAULT 0, comorbidade_oxigenio INTEGER DEFAULT 0, comorbidade_quimioterapia INTEGER DEFAULT 0, pets TEXT, evacuation_logistics TEXT NOT NULL, shelter_plan TEXT NOT NULL, preventive_aid TEXT, flood_level REAL NOT NULL, evacuation_level REAL, latitude REAL, longitude REAL, evacuation_status TEXT DEFAULT 'unknown', registered_by TEXT DEFAULT 'citizen', agent_notes TEXT, shelter_name TEXT, house_number TEXT DEFAULT '', health_markers TEXT DEFAULT '[]', household_members TEXT DEFAULT '[]', emergency_contact_name TEXT, emergency_contact_phone TEXT, needs_evacuation_help INTEGER DEFAULT 0, evacuation_reason TEXT, needs_truck INTEGER DEFAULT 0, pets_info TEXT DEFAULT '[]', shelter_destination TEXT, registration_step INTEGER DEFAULT 1, registration_complete INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS shelters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, latitude REAL, longitude REAL, capacity INTEGER DEFAULT 0, type TEXT DEFAULT 'shelter', contact TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS evacuation_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, geojson_data TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS river_levels (id INTEGER PRIMARY KEY AUTOINCREMENT, level REAL NOT NULL, timestamp TEXT DEFAULT (datetime('now')), source TEXT DEFAULT 'manual');
        CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), is_active INTEGER DEFAULT 1);
        CREATE TABLE IF NOT EXISTS station_data (id INTEGER PRIMARY KEY AUTOINCREMENT, station TEXT NOT NULL, level REAL, trend TEXT DEFAULT 'stable', trend_rate REAL DEFAULT 0, status TEXT DEFAULT 'normal', percentage REAL DEFAULT 0, source TEXT DEFAULT 'unknown', recorded_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, total_rows INTEGER DEFAULT 0, imported_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', error TEXT, imported_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, user_name TEXT, user_profile TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, old_values TEXT, new_values TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS pets (id INTEGER PRIMARY KEY AUTOINCREMENT, owner_name TEXT, owner_cpf TEXT, owner_address TEXT DEFAULT '', owner_neighborhood TEXT DEFAULT '', owner_phone TEXT DEFAULT '', owner_location TEXT DEFAULT 'propria_residencia', pet_name TEXT NOT NULL, pet_type TEXT NOT NULL, pet_breed TEXT DEFAULT '', pet_age TEXT DEFAULT '', residence_id INTEGER, notes TEXT DEFAULT '', pet_photos TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS belongings (id INTEGER PRIMARY KEY AUTOINCREMENT, family_name TEXT NOT NULL, family_cpf TEXT DEFAULT '', family_phone TEXT DEFAULT '', registration_number TEXT DEFAULT '', items TEXT DEFAULT '[]', storage_location TEXT DEFAULT '', shelter_id INTEGER, notes TEXT DEFAULT '', registered_by INTEGER REFERENCES users(id), photos TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
      `)
      const alterCols = [
        "ALTER TABLE audit_logs ADD COLUMN user_profile TEXT",
        "ALTER TABLE audit_logs ADD COLUMN ip_address TEXT",
        "ALTER TABLE residences ADD COLUMN health_markers TEXT DEFAULT '[]'",
        "ALTER TABLE residences ADD COLUMN household_members TEXT DEFAULT '[]'",
        "ALTER TABLE residences ADD COLUMN emergency_contact_name TEXT",
        "ALTER TABLE residences ADD COLUMN emergency_contact_phone TEXT",
        "ALTER TABLE residences ADD COLUMN needs_evacuation_help INTEGER DEFAULT 0",
        "ALTER TABLE residences ADD COLUMN evacuation_reason TEXT",
        "ALTER TABLE residences ADD COLUMN needs_truck INTEGER DEFAULT 0",
        "ALTER TABLE residences ADD COLUMN pets_info TEXT DEFAULT '[]'",
        "ALTER TABLE residences ADD COLUMN shelter_destination TEXT",
        "ALTER TABLE residences ADD COLUMN registration_step INTEGER DEFAULT 1",
        "ALTER TABLE residences ADD COLUMN registration_complete INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN cpf TEXT UNIQUE",
        "ALTER TABLE users ADD COLUMN profile TEXT DEFAULT 'CIDADAO'",
        "ALTER TABLE users ADD COLUMN approved_profiles TEXT DEFAULT '[]'",
        "ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id)",
        "ALTER TABLE users ADD COLUMN approved_at TEXT",
      ]
      for (const sql of alterCols) { try { db.exec(sql) } catch {} }
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, cpf TEXT UNIQUE, email TEXT, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','superadmin','agent')), profile TEXT DEFAULT 'CIDADAO' CHECK (profile IN ('CIDADAO','ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO')), agent_area TEXT, agent_status TEXT DEFAULT 'pending', approved_profiles TEXT DEFAULT '[]', approved_by INTEGER REFERENCES users(id), approved_at TIMESTAMP, phone TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS residences (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, address TEXT NOT NULL, neighborhood TEXT NOT NULL, residents INTEGER NOT NULL, comorbidities TEXT, has_elderly BOOLEAN DEFAULT false, has_children BOOLEAN DEFAULT false, has_pregnant BOOLEAN DEFAULT false, has_disabled BOOLEAN DEFAULT false, telefone_contato TEXT, telefone_emergencia TEXT, possui_veiculo BOOLEAN DEFAULT false, possui_animais_grande_porte BOOLEAN DEFAULT false, acesso_superior BOOLEAN DEFAULT false, medicamentos_continuos TEXT, necessita_energia BOOLEAN DEFAULT false, abrigo_preferencial TEXT, pontos_referencia TEXT, comorbidade_respiratoria BOOLEAN DEFAULT false, comorbidade_cardiaca BOOLEAN DEFAULT false, comorbidade_diabetes BOOLEAN DEFAULT false, comorbidade_renal BOOLEAN DEFAULT false, comorbidade_neurologica BOOLEAN DEFAULT false, comorbidade_mobilidade BOOLEAN DEFAULT false, comorbidade_saude_mental BOOLEAN DEFAULT false, comorbidade_alergias BOOLEAN DEFAULT false, comorbidade_oxigenio BOOLEAN DEFAULT false, comorbidade_quimioterapia BOOLEAN DEFAULT false, pets TEXT, evacuation_logistics TEXT NOT NULL, shelter_plan TEXT NOT NULL, preventive_aid TEXT, flood_level REAL NOT NULL, evacuation_level REAL, latitude REAL, longitude REAL, evacuation_status TEXT DEFAULT 'unknown', registered_by TEXT DEFAULT 'citizen', agent_notes TEXT, shelter_name TEXT, house_number TEXT DEFAULT '', health_markers TEXT DEFAULT '[]', household_members TEXT DEFAULT '[]', emergency_contact_name TEXT, emergency_contact_phone TEXT, needs_evacuation_help BOOLEAN DEFAULT false, evacuation_reason TEXT, needs_truck BOOLEAN DEFAULT false, pets_info TEXT DEFAULT '[]', shelter_destination TEXT, registration_step INTEGER DEFAULT 1, registration_complete BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS shelters (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT, latitude REAL, longitude REAL, capacity INTEGER DEFAULT 0, type TEXT DEFAULT 'shelter', contact TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS evacuation_routes (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, geojson_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS river_levels (id SERIAL PRIMARY KEY, level REAL NOT NULL, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, source TEXT DEFAULT 'manual');
        CREATE TABLE IF NOT EXISTS alerts (id SERIAL PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_active BOOLEAN DEFAULT true);
        CREATE TABLE IF NOT EXISTS station_data (id SERIAL PRIMARY KEY, station TEXT NOT NULL, level REAL, trend TEXT DEFAULT 'stable', trend_rate REAL DEFAULT 0, status TEXT DEFAULT 'normal', percentage REAL DEFAULT 0, source TEXT DEFAULT 'unknown', recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS import_log (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, total_rows INTEGER DEFAULT 0, imported_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', error TEXT, imported_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS audit_logs (id SERIAL PRIMARY KEY, user_id INTEGER, user_name TEXT, user_profile TEXT, action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id INTEGER, old_values TEXT, new_values TEXT, ip_address TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS pets (id SERIAL PRIMARY KEY, owner_name TEXT, owner_cpf TEXT, owner_address TEXT DEFAULT '', owner_neighborhood TEXT DEFAULT '', owner_phone TEXT DEFAULT '', owner_location TEXT DEFAULT 'propria_residencia', pet_name TEXT NOT NULL, pet_type TEXT NOT NULL, pet_breed TEXT DEFAULT '', pet_age TEXT DEFAULT '', residence_id INTEGER, notes TEXT DEFAULT '', pet_photos TEXT DEFAULT '[]', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS belongings (id SERIAL PRIMARY KEY, family_name TEXT NOT NULL, family_cpf TEXT DEFAULT '', family_phone TEXT DEFAULT '', registration_number TEXT DEFAULT '', items TEXT DEFAULT '[]', storage_location TEXT DEFAULT '', shelter_id INTEGER, notes TEXT DEFAULT '', registered_by INTEGER REFERENCES users(id), photos TEXT DEFAULT '[]', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      `)
      const alterCols = [
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_profile TEXT",
        "ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address TEXT",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS health_markers TEXT DEFAULT '[]'",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS household_members TEXT DEFAULT '[]'",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS needs_evacuation_help BOOLEAN DEFAULT false",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS evacuation_reason TEXT",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS needs_truck BOOLEAN DEFAULT false",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS pets_info TEXT DEFAULT '[]'",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS shelter_destination TEXT",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS registration_step INTEGER DEFAULT 1",
        "ALTER TABLE residences ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS cpf TEXT UNIQUE",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile TEXT DEFAULT 'CIDADAO'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_profiles TEXT DEFAULT '[]'",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP",
      ]
      for (const sql of alterCols) { try { await db.exec(sql) } catch {} }
    }

    const adminCpf = process.env.ADMIN_CPF || '03738056084'
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminPassword) {
      const existing = await runGet(db, 'SELECT id FROM users WHERE cpf = $1 OR email = $2', [adminCpf, process.env.ADMIN_EMAIL || 'admin@geojeronimo.com'])
      const hashed = await bcrypt.hash(adminPassword, 10)
      if (!existing) {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@geojeronimo.com'
        await runRun(db, "INSERT INTO users (cpf, email, password, name, role, profile, agent_status) VALUES ($1, $2, $3, $4, 'admin', 'ADMIN', 'approved')", [adminCpf, adminEmail, hashed, 'Administrador'])
        console.log('Admin user created')
      } else {
        await runRun(db, "UPDATE users SET role = 'admin', profile = 'ADMIN', password = $1, agent_status = 'approved', cpf = $2, email = $3 WHERE id = $4", [hashed, adminCpf, process.env.ADMIN_EMAIL || 'admin@geojeronimo.com', existing.id])
      }
    }
    console.log('Database migrations OK')
  } catch (err) {
    console.error('Migration error:', err.message)
  }
}

async function autoAlertCheck() {
  try {
    const dcData = await fetchDefesaCivilData()
    const currentLevel = dcData?.['DCRS-00093']?.level
    if (currentLevel == null) return

    const isSqlite = db.type === 'sqlite'
    const atRisk = await runQuery(db, `
      SELECT r.id, r.user_id, r.evacuation_level, r.flood_level, r.address, r.neighborhood,
             u.name, u.email
      FROM residences r JOIN users u ON r.user_id = u.id
      WHERE r.evacuation_level IS NOT NULL
        AND r.evacuation_level <= $1
        AND r.flood_level > $1
    `, [currentLevel])

    if (atRisk.length === 0) return

    const alreadyAlerted = await runQuery(db,
      isSqlite
        ? `SELECT DISTINCT substr(message, instr(message, 'Residência #') + 11, 10) as rid FROM alerts WHERE is_active = 1 AND source = 'auto'`
        : `SELECT DISTINCT substring(message from 'Residência #([0-9]+)') as rid FROM alerts WHERE is_active = true AND source = 'auto'`
    )
    const alertedIds = new Set(alreadyAlerted.map(a => String(a.rid).trim()).filter(Boolean))

    for (const residence of atRisk) {
      if (alertedIds.has(String(residence.id))) continue
      await runRun(db,
        `INSERT INTO alerts (type, title, message, source) VALUES ($1, $2, $3, $4)`,
        ['warning', `Alerta de Evacuação - ${residence.neighborhood}`,
         `${residence.name}, o rio atingiu ${currentLevel.toFixed(2)}m em São Jerônimo. ` +
         `Sua residência em ${residence.address} tem nível de alerta em ${residence.evacuation_level}m. ` +
         `Residência #${residence.id}. Prepare-se para evacuar!`, 'auto'])
    }
    console.log(`[Auto-Alert] Check: rio=${currentLevel.toFixed(2)}m, residências=${atRisk.length}, novos_alertas=${atRisk.length - alertedIds.size}`)
  } catch { /* cron failures are logged silently */ }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  const corsOrigins = ['http://localhost:3000', 'http://localhost:5000', 'https://geojeronimo-v4.vercel.app', 'https://geosaojeronimo.vercel.app', 'https://geo-jeronimo-production.up.railway.app']
  console.log(`CORS: origins=${JSON.stringify(corsOrigins)}`)
  await runMigrations()
  await seedDatabase()
  cron.schedule('*/15 * * * *', () => { autoAlertCheck() })
  console.log('[Cron] Auto-alert scheduled every 15 minutes')
})

// redeploy trigger
