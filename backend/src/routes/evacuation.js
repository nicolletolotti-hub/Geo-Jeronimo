import express from 'express'
import db from '../database/db.js'
import { runQuery, runRun } from '../database/helpers.js'
import { authenticateToken, requireAgent } from '../middleware/auth.js'
import { logAudit } from '../database/audit.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const routes = await runQuery(db, 'SELECT * FROM evacuation_routes ORDER BY name')
    res.json(routes)
  } catch (error) {
    console.error('Get evacuation routes error:', error)
    res.json([])
  }
})

router.post('/', authenticateToken, requireAgent, async (req, res) => {
  try {
    const { name, description, geojson_data } = req.body
    if (!name || !geojson_data) {
      return res.status(400).json({ error: 'Nome e dados GeoJSON são obrigatórios' })
    }
    const result = await runRun(db,
      `INSERT INTO evacuation_routes (name, description, geojson_data) VALUES ($1, $2, $3) RETURNING id`,
      [name, description || '', JSON.stringify(geojson_data)]
    )
    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'CREATE', entityType: 'evacuation_route', entityId: result.lastID,
      newValues: { name },
      ipAddress: req.ip,
    })
    res.status(201).json({ message: 'Rota de evacuação cadastrada' })
  } catch (error) {
    console.error('Create evacuation route error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar rota' })
  }
})

router.delete('/:id', authenticateToken, requireAgent, async (req, res) => {
  try {
    await runRun(db, 'DELETE FROM evacuation_routes WHERE id = $1', [req.params.id])
    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'DELETE', entityType: 'evacuation_route', entityId: parseInt(req.params.id),
      ipAddress: req.ip,
    })
    res.json({ message: 'Rota removida' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover rota' })
  }
})

export default router
