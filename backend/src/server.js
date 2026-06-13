import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import compression from 'compression'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

import bcrypt from 'bcryptjs'
import pool from './database/db.js'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logFile = path.join(__dirname, '../../server-error.log')
function logError(...args) {
  try {
    const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? (a.stack || a.message || JSON.stringify(a)) : a).join(' ')}\n`
    fs.appendFileSync(logFile, line)
  } catch {}
  console.error(...args)
}

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet({
  contentSecurityPolicy: false
}))

app.use(compression())

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Muitas requisições deste IP, tente novamente mais tarde',
  standardHeaders: true,
  legacyHeaders: false
})
app.use('/api/', limiter)

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173,https://geosaojeronimo.vercel.app').split(',')
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, false)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true
}))

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
    const schema = `
      CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT DEFAULT 'user' CHECK (role IN ('user','admin','superadmin','agent')), agent_area TEXT, agent_status TEXT DEFAULT 'pending', agent_approved_by INTEGER REFERENCES users(id), agent_approved_at TIMESTAMP, phone TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS residences (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, address TEXT NOT NULL, neighborhood TEXT NOT NULL, residents INTEGER NOT NULL, comorbidities TEXT, has_elderly BOOLEAN DEFAULT false, has_children BOOLEAN DEFAULT false, has_pregnant BOOLEAN DEFAULT false, has_disabled BOOLEAN DEFAULT false, telefone_contato TEXT, telefone_emergencia TEXT, possui_veiculo BOOLEAN DEFAULT false, possui_animais_grande_porte BOOLEAN DEFAULT false, acesso_superior BOOLEAN DEFAULT false, medicamentos_continuos TEXT, necessita_energia BOOLEAN DEFAULT false, abrigo_preferencial TEXT, pontos_referencia TEXT, comorbidade_respiratoria BOOLEAN DEFAULT false, comorbidade_cardiaca BOOLEAN DEFAULT false, comorbidade_diabetes BOOLEAN DEFAULT false, comorbidade_renal BOOLEAN DEFAULT false, comorbidade_neurologica BOOLEAN DEFAULT false, comorbidade_mobilidade BOOLEAN DEFAULT false, comorbidade_saude_mental BOOLEAN DEFAULT false, comorbidade_alergias BOOLEAN DEFAULT false, comorbidade_oxigenio BOOLEAN DEFAULT false, comorbidade_quimioterapia BOOLEAN DEFAULT false, pets TEXT, evacuation_logistics TEXT NOT NULL, shelter_plan TEXT NOT NULL, preventive_aid TEXT, flood_level REAL NOT NULL, evacuation_level REAL, latitude REAL, longitude REAL, evacuation_status TEXT DEFAULT 'unknown', registered_by TEXT DEFAULT 'citizen', agent_notes TEXT, shelter_name TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS shelters (id SERIAL PRIMARY KEY, name TEXT NOT NULL, address TEXT, latitude REAL, longitude REAL, capacity INTEGER DEFAULT 0, type TEXT DEFAULT 'shelter', contact TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS evacuation_routes (id SERIAL PRIMARY KEY, name TEXT NOT NULL, description TEXT, geojson_data JSONB, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS river_levels (id SERIAL PRIMARY KEY, level REAL NOT NULL, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, source TEXT DEFAULT 'manual');
      CREATE TABLE IF NOT EXISTS alerts (id SERIAL PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, is_active BOOLEAN DEFAULT true);
      CREATE TABLE IF NOT EXISTS station_data (id SERIAL PRIMARY KEY, station TEXT NOT NULL, level REAL, trend TEXT DEFAULT 'stable', trend_rate REAL DEFAULT 0, status TEXT DEFAULT 'normal', percentage REAL DEFAULT 0, source TEXT DEFAULT 'unknown', recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE IF NOT EXISTS import_log (id SERIAL PRIMARY KEY, filename TEXT NOT NULL, total_rows INTEGER DEFAULT 0, imported_rows INTEGER DEFAULT 0, skipped_rows INTEGER DEFAULT 0, status TEXT DEFAULT 'completed', error TEXT, imported_by INTEGER REFERENCES users(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
    `
    const migration = `
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
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS telefone_contato TEXT;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS telefone_emergencia TEXT;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS possui_veiculo BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS possui_animais_grande_porte BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS acesso_superior BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS medicamentos_continuos TEXT;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS necessita_energia BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS abrigo_preferencial TEXT;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS pontos_referencia TEXT;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_respiratoria BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_cardiaca BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_diabetes BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_renal BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_neurologica BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_mobilidade BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_saude_mental BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_alergias BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_oxigenio BOOLEAN DEFAULT false;
      ALTER TABLE residences ADD COLUMN IF NOT EXISTS comorbidade_quimioterapia BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_area TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_status TEXT DEFAULT 'pending';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_approved_by INTEGER REFERENCES users(id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_approved_at TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
    `
    await pool.query(schema)
    await pool.query(migration)
    const adminEmail = 'admin@geojeronimo.com'
    const adminPassword = 'SuaSenha123'
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail])
    if (existing.rows.length === 0) {
      const hashed = await bcrypt.hash(adminPassword, 10)
      await pool.query("INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, 'admin')", [adminEmail, hashed, 'Administrador'])
      console.log('Admin user created')
    } else {
      const hashed = await bcrypt.hash(adminPassword, 10)
      await pool.query("UPDATE users SET role = 'admin', password = $1 WHERE email = $2", [hashed, adminEmail])
    }
    console.log('Database migrations OK')
  } catch (err) {
    console.error('Migration error:', err.message)
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
  await runMigrations()
})
