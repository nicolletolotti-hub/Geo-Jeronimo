import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createLogger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = Router()
const { log: logError } = createLogger('server-error.log')
const DATA_DIR = path.join(__dirname, '../../data/inundacao')

function levelToFilename(level) {
  const s = level % 1 === 0 ? `${level}m` : `${level.toFixed(1)}m`
  return `flood_${s}_clean.geojson`
}

router.get('/geojson/:level', async (req, res) => {
  try {
    const level = parseFloat(req.params.level)
    if (isNaN(level) || level < 1 || level > 15) {
      return res.status(400).json({ error: 'Nível inválido (1-15)' })
    }
    for (let attempt = level; attempt >= 1; attempt -= 0.2) {
      const rounded = Math.round(attempt * 5) / 5
      const filename = levelToFilename(rounded)
      const filepath = path.join(DATA_DIR, filename)
      if (fs.existsSync(filepath)) {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'))
        return res.json(data)
      }
    }
    res.status(404).json({ error: 'Nenhum GeoJSON encontrado' })
  } catch (error) {
    logError('Flood GeoJSON error:', error)
    res.status(500).json({ error: 'Erro ao carregar dados de inundação' })
  }
})

export default router
