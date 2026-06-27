import express from 'express'
import db from '../database/db.js'
import { runQuery, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { logAudit } from '../database/audit.js'
import { AlertSchema, validateData } from '../utils/validators.js'

const router = express.Router()

async function safeQuery(promise, fallback = []) {
  try { return await promise } catch (e) { return fallback }
}

// Get active alerts with statistics
router.get('/active', async (req, res) => {
  try {
    const alerts = await safeQuery(
      runQuery(db, `
        SELECT * FROM alerts 
        WHERE is_active = true 
        ORDER BY created_at DESC 
        LIMIT 20
      `)
    )

    const stats = await safeQuery(
      runQuery(db, `
        SELECT 
          type,
          COUNT(*) as count,
          MAX(created_at) as latest
        FROM alerts 
        WHERE is_active = true 
        GROUP BY type
      `)
    )

    const totalActive = alerts.length
    const typeCounts = {}
    stats.forEach(stat => {
      typeCounts[stat.type] = parseInt(stat.count)
    })

    res.json({
      alerts,
      statistics: {
        total: totalActive,
        byType: typeCounts,
        latest: alerts.length > 0 ? alerts[0].created_at : null
      }
    })
  } catch (error) {
    console.error('Get alerts error:', error)
    res.json({
      alerts: [],
      statistics: { total: 0, byType: {}, latest: null }
    })
  }
})

// Create alert (admin only) - PROTECTED
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validation = validateData(AlertSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { type, title, message, source } = validation.data

    const result = await runRun(
      db,
      'INSERT INTO alerts (type, title, message, source) VALUES ($1, $2, $3, $4) RETURNING id',
      [type, title, message, source]
    )

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'CREATE', entityType: 'alert', entityId: result.lastID,
      newValues: { type, title, source },
      ipAddress: req.ip,
    })

    res.status(201).json({ message: 'Alerta criado com sucesso' })
  } catch (error) {
    console.error('Create alert error:', error)
    res.status(500).json({ error: 'Erro ao criar alerta' })
  }
})

// Deactivate alert (admin only) - PROTECTED
router.patch('/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await runRun(
      db,
      'UPDATE alerts SET is_active = false WHERE id = $1',
      [req.params.id]
    )

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'UPDATE', entityType: 'alert', entityId: parseInt(req.params.id),
      newValues: { is_active: false },
      ipAddress: req.ip,
    })

    res.json({ message: 'Alerta desativado com sucesso' })
  } catch (error) {
    console.error('Deactivate alert error:', error)
    res.status(500).json({ error: 'Erro ao desativar alerta' })
  }
})

export default router
