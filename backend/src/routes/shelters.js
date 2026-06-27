import express from 'express'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAgent } from '../middleware/auth.js'
import { logAudit } from '../database/audit.js'
import { ShelterSchema, validateData } from '../utils/validators.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const shelters = await runQuery(db, 'SELECT * FROM shelters ORDER BY name')
    res.json(shelters)
  } catch (error) {
    console.error('Get shelters error:', error)
    res.json([])
  }
})

router.post('/', authenticateToken, requireAgent, async (req, res) => {
  try {
    const validation = validateData(ShelterSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }
    const { name, address, latitude, longitude, capacity, type, contact } = validation.data
    const result = await runRun(db,
      `INSERT INTO shelters (name, address, latitude, longitude, capacity, type, contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, address || '', latitude || null, longitude || null, capacity, type || 'shelter', contact || '']
    )
    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'CREATE', entityType: 'shelter', entityId: result.lastID,
      newValues: { name, address, capacity },
      ipAddress: req.ip,
    })
    res.status(201).json({ message: 'Abrigo cadastrado' })
  } catch (error) {
    console.error('Create shelter error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar abrigo' })
  }
})

router.delete('/:id', authenticateToken, requireAgent, async (req, res) => {
  try {
    await runRun(db, 'DELETE FROM shelters WHERE id = $1', [req.params.id])
    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'DELETE', entityType: 'shelter', entityId: parseInt(req.params.id),
      ipAddress: req.ip,
    })
    res.json({ message: 'Abrigo removido' })
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover abrigo' })
  }
})

export default router
