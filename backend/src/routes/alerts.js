import express from 'express'
import db from '../database/db.js'
import { runQuery, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { AlertSchema, validateData } from '../utils/validators.js'

const router = express.Router()

// Get active alerts with statistics
router.get('/active', async (req, res) => {
  try {
    const alerts = await runQuery(
      db,
      `
      SELECT * FROM alerts 
      WHERE is_active = true 
      ORDER BY created_at DESC 
      LIMIT 20
    `
    )

    // Get alert statistics
    const stats = await runQuery(
      db,
      `
      SELECT 
        type,
        COUNT(*) as count,
        MAX(created_at) as latest
      FROM alerts 
      WHERE is_active = true 
      GROUP BY type
    `
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
    res.status(500).json({ error: 'Erro ao buscar alertas' })
  }
})

// Create alert (admin only) - PROTECTED
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Validate input
    const validation = validateData(AlertSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { type, title, message, source } = validation.data

    await runRun(
      db,
      'INSERT INTO alerts (type, title, message, source) VALUES ($1, $2, $3, $4)',
      [type, title, message, source]
    )

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

    res.json({ message: 'Alerta desativado com sucesso' })
  } catch (error) {
    console.error('Deactivate alert error:', error)
    res.status(500).json({ error: 'Erro ao desativar alerta' })
  }
})

export default router
