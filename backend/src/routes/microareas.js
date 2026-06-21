import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = express.Router()

router.get('/', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../../data/microareas.geojson')
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo de microáreas não encontrado' })
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    res.json(data)
  } catch (error) {
    console.error('Error loading microareas:', error)
    res.status(500).json({ error: 'Erro ao carregar microáreas' })
  }
})

export default router
