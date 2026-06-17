import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
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
  origin: true,
  credentials: true
}))

app.use('/api/', limiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','superadmin','agent')), agent_area TEXT, agent_status TEXT DEFAULT 'pending', agent_approved_by INTEGER REFERENCES users(id), agent_approved_at TEXT, phone TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS residences (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, address TEXT NOT NULL, neighborhood TEXT NOT NULL, residents INTEGER NOT NULL, comorbidities TEXT, has_elderly INTEGER DEFAULT 0, has_children INTEGER DEFAULT 0, has_pregnant INTEGER DEFAULT 0, has_disabled INTEGER DEFAULT 0, telefone_contato TEXT, telefone_emergencia TEXT, possui_veiculo INTEGER DEFAULT 0, possui_animais_grande_porte INTEGER DEFAULT 0, acesso_superior INTEGER DEFAULT 0, medicamentos_continuos TEXT, necessita_energia INTEGER DEFAULT 0, abrigo_preferencial TEXT, pontos_referencia TEXT, comorbidade_respiratoria INTEGER DEFAULT 0, comorbidade_cardiaca INTEGER DEFAULT 0, comorbidade_diabetes INTEGER DEFAULT 0, comorbidade_renal INTEGER DEFAULT 0, comorbidade_neurologica INTEGER DEFAULT 0, comorbidade_mobilidade INTEGER DEFAULT 0, comorbidade_saude_mental INTEGER DEFAULT 0, comorbidade_alergias INTEGER DEFAULT 0, comorbidade_oxigenio INTEGER DEFAULT 0, comorbidade_quimioterapia INTEGER DEFAULT 0, pets TEXT, evacuation_logistics TEXT NOT NULL, shelter_plan TEXT NOT NULL, preventive_aid TEXT, flood_level REAL NOT NULL, evacuation_level REAL, latitude REAL, longitude REAL, evacuation_status TEXT DEFAULT 'unknown', registered_by TEXT DEFAULT 'citizen', agent_notes TEXT, shelter_name TEXT, house_number TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS shelters (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, address TEXT, latitude REAL, longitude REAL, capacity INTEGER DEFAULT 0, type TEXT DEFAULT 'shelter', contact TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS evacuation_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, geojson_data TEXT, created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS river_levels (id INTEGER PRIMARY KEY AUTOINCREMENT, level REAL NOT NULL, timestamp TEXT DEFAULT (datetime('now')), source TEXT DEFAULT 'manual');
        CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), is_active INTEGER DEFAULT 1);
        CREATE TABLE IF NOT EXISTS station_data (id INTEGER PRIMARY KEY AUTOINCREMENT, station TEXT NOT NULL, level REAL, trend TEXT DEFAULT 'stable', trend_rate REAL DEFAULT 0, status TEXT DEFAULT 'normal', percentage REAL DEFAULT 0, source TEXT DEFAULT 'unknown', recorded_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS import_log (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT NOT NULL, total_rows INTEGER DEFAULT 0, imported_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', error TEXT, imported_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT (datetime('now')));
        ALTER TABLE residences ADD COLUMN prescription_photos TEXT DEFAULT '[]';
      `)
    } else {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','superadmin','agent')), agent_area TEXT, agent_status TEXT DEFAULT 'pending', agent_approved_by INTEGER REFERENCES users(id), agent_approved_at TIMESTAMP, phone TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS residences (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, address TEXT NOT NULL, neighborhood TEXT NOT NULL, residents INTEGER NOT NULL, comorbidities TEXT, has_elderly BOOLEAN DEFAULT false, has_children BOOLEAN DEFAULT false, has_pregnant BOOLEAN DEFAULT false, has_disabled BOOLEAN DEFAULT false, telefone_contato TEXT, telefone_emergencia TEXT, possui_veiculo BOOLEAN DEFAULT false, possui_animais_grande_porte BOOLEAN DEFAULT false, acesso_superior BOOLEAN DEFAULT false, medicamentos_continuos TEXT, necessita_energia BOOLEAN DEFAULT false, abrigo_preferencial TEXT, pontos_referencia TEXT, comorbidade_respiratoria BOOLEAN DEFAULT false, comorbidade_cardiaca BOOLEAN DEFAULT false, comorbidade_diabetes BOOLEAN DEFAULT false, comorbidade_renal BOOLEAN DEFAULT false, comorbidade_neurologica BOOLEAN DEFAULT false, comorbidade_mobilidade BOOLEAN DEFAULT false, comorbidade_saude_mental BOOLEAN DEFAULT false, comorbidade_alergias BOOLEAN DEFAULT false, comorbidade_oxigenio BOOLEAN DEFAULT false, comorbidade_quimioterapia BOOLEAN DEFAULT false, pets TEXT, evacuation_logistics TEXT NOT NULL, shelter_plan TEXT NOT NULL, preventive_aid TEXT, flood_level REAL NOT NULL, evacuation_level REAL, latitude REAL, longitude REAL, evacuation_status TEXT DEFAULT 'unknown', registered_by TEXT DEFAULT 'citizen', agent_notes TEXT, shelter_name TEXT, house_number TEXT DEFAULT '', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS shelters (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT, latitude REAL, longitude REAL, capacity INTEGER DEFAULT 0, type TEXT DEFAULT 'shelter', contact TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS evacuation_routes (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, geojson_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS river_levels (id SERIAL PRIMARY KEY, level REAL NOT NULL, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, source TEXT DEFAULT 'manual');
        CREATE TABLE IF NOT EXISTS alerts (id SERIAL PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_active BOOLEAN DEFAULT true);
        CREATE TABLE IF NOT EXISTS station_data (id SERIAL PRIMARY KEY, station TEXT NOT NULL, level REAL, trend TEXT DEFAULT 'stable', trend_rate REAL DEFAULT 0, status TEXT DEFAULT 'normal', percentage REAL DEFAULT 0, source TEXT DEFAULT 'unknown', recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS import_log (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, total_rows INTEGER DEFAULT 0, imported_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', error TEXT, imported_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      `)
      await db.exec(`
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS evacuation_level REAL;
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_elderly BOOLEAN DEFAULT false;
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_children BOOLEAN DEFAULT false;
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_pregnant BOOLEAN DEFAULT false;
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS has_disabled BOOLEAN DEFAULT false;
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS evacuation_status TEXT DEFAULT 'unknown';
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS registered_by TEXT DEFAULT 'citizen';
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS agent_notes TEXT;
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS shelter_name TEXT;
        ALTER TABLE shelters ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'shelter';
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS house_number TEXT DEFAULT '';
        ALTER TABLE residences ADD COLUMN IF NOT EXISTS prescription_photos TEXT DEFAULT '[]';
      `)
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@geojeronimo.com'
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminPassword) {
      const existing = await runGet(db, 'SELECT id FROM users WHERE email = $1', [adminEmail])
      const hashed = await bcrypt.hash(adminPassword, 10)
      if (!existing) {
        await runRun(db, "INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, 'admin')", [adminEmail, hashed, 'Administrador'])
        console.log('Admin user created')
      } else {
        await runRun(db, "UPDATE users SET role = 'admin', password = $1 WHERE email = $2", [hashed, adminEmail])
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
  console.log(`CORS: origin=true (allow all)`)
  await runMigrations()
  await seedDatabase()
  cron.schedule('*/15 * * * *', () => { autoAlertCheck() })
  console.log('[Cron] Auto-alert scheduled every 15 minutes')
})

// redeploy trigger
