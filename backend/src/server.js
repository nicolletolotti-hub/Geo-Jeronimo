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
  console.error('[server] Unhandled Rejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[server] Uncaught Exception:', err)
})

import db from './database/db.js'
import { initDatabase } from './database/init.js'
import { seedDatabase } from './database/seed.js'
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
import { createLogger } from './utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { log: logError } = createLogger('server-error.log')

const app = express()
const PORT = process.env.PORT || 5000

app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' }, crossOriginOpenerPolicy: { policy: 'unsafe-none' } }))
app.use(compression())
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false })
app.use('/api/', limiter)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use('/data', express.static(path.join(__dirname, '../../data')))

app.get('/api/health', async (req, res) => {
  try {
    await db.query('SELECT 1')
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), database: 'connected' })
  } catch (err) {
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString(), database: 'disconnected' })
  }
})

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

app.use((err, req, res, _next) => {
  logError(`ERROR: ${err.stack || err.message}`)
  res.status(err.status || 500).json({ error: process.env.NODE_ENV === 'development' ? err.message : 'Ocorreu um erro inesperado.' })
})

async function autoAlertCheck() {
  try {
    const dcData = await fetchDefesaCivilData()
    const currentLevel = dcData?.['DCRS-00093']?.level
    if (currentLevel == null) return
    const { rows: atRisk } = await db.query(
      `SELECT r.id, r.evacuation_level, r.flood_level, r.address, r.neighborhood, u.name
       FROM residences r JOIN users u ON r.user_id = u.id
       WHERE r.evacuation_level IS NOT NULL AND r.evacuation_level <= $1 AND r.flood_level > $1`,
      [currentLevel]
    )
    if (!atRisk.length) return
    const { rows: alerted } = await db.query(`SELECT DISTINCT substring(message from 'Residência #([0-9]+)') AS rid FROM alerts WHERE is_active=true AND source='auto'`)
    const alertedIds = new Set(alerted.map(a => String(a.rid).trim()).filter(Boolean))
    for (const r of atRisk) {
      if (alertedIds.has(String(r.id))) continue
      await db.query(`INSERT INTO alerts (type,title,message,source) VALUES ($1,$2,$3,$4)`, [
        'warning', `Alerta de Evacuação - ${r.neighborhood}`,
        `${r.name}, o rio atingiu ${currentLevel.toFixed(2)}m. Residência #${r.id} em ${r.address}. Prepare-se para evacuar!`,
        'auto'
      ])
    }
  } catch (err) { console.error('[cron] error:', err.message) }
}

async function startServer() {
  try {
    await db.query('SELECT 1')
    console.log('[db] Connected.')
    await initDatabase()
    await seedDatabase()
    app.listen(PORT, () => {
      console.log(`[server] Running on port ${PORT} | NODE_ENV=${process.env.NODE_ENV || 'development'}`)
      if (process.env.ENABLE_CRON === 'true') {
        cron.schedule('*/15 * * * *', autoAlertCheck)
        console.log('[cron] Auto-alert scheduled.')
      }
    })
  } catch (error) {
    logError('[server] Failed to start:', error)
    process.exit(1)
  }
}

startServer()
