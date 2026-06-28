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
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
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

async function autoAlertCheck() {
  try {
    const dcData = await fetchDefesaCivilData()
    const currentLevel = dcData?.['DCRS-00093']?.level
    if (currentLevel == null) return

    const { rows: atRisk } = await db.query(`
      SELECT r.id, r.user_id, r.evacuation_level, r.flood_level, r.address, r.neighborhood,
             u.name, u.email
      FROM residences r JOIN users u ON r.user_id = u.id
      WHERE r.evacuation_level IS NOT NULL
        AND r.evacuation_level <= $1
        AND r.flood_level > $1
    `, [currentLevel])
    if (atRisk.length === 0) return

    const { rows: alreadyAlerted } = await db.query(
      `SELECT DISTINCT substring(message from 'Residência #([0-9]+)') as rid FROM alerts WHERE is_active = true AND source = 'auto'`
    )
    const alertedIds = new Set(alreadyAlerted.map(a => String(a.rid).trim()).filter(Boolean))

    for (const residence of atRisk) {
      if (alertedIds.has(String(residence.id))) continue
      await db.query(
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
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')
  console.log(`CORS enabled for: ${JSON.stringify(corsOrigins)}`)
  // A criação do usuário admin e outros dados iniciais agora é responsabilidade dos scripts de seed.
  // A estrutura do banco é garantida pelas migrations.
  // Para criar o admin, você pode rodar um script de seed manualmente ou configurá-lo para rodar aqui.
  // Por enquanto, vamos focar em ter o servidor rodando.
  // await seedDatabase() // Se você tiver um seeder, pode ativá-lo aqui.
  cron.schedule('*/15 * * * *', () => { autoAlertCheck() })
  console.log('[Cron] Auto-alert scheduled every 15 minutes')
})

// redeploy trigger
