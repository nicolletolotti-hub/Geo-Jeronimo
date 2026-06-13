import express from 'express'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { fetchDefesaCivilData } from '../utils/defesaCivilApi.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/check', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const dcData = await fetchDefesaCivilData()
    const currentLevel = dcData?.['DCRS-00093']?.level
    if (currentLevel == null) {
      return res.json({ checked: false, reason: 'Nível do rio indisponível' })
    }

    const atRisk = await runQuery(db, `
      SELECT r.id, r.user_id, r.evacuation_level, r.flood_level, r.address, r.neighborhood,
             u.name, u.email
      FROM residences r
      JOIN users u ON r.user_id = u.id
      WHERE r.evacuation_level IS NOT NULL
        AND r.evacuation_level <= $1
        AND r.flood_level > $1
    `, [currentLevel])

    const alreadyAlerted = await runQuery(db,
      `SELECT DISTINCT substring(message from 'Residência #([0-9]+)') as rid
       FROM alerts WHERE is_active = true AND source = 'auto'
    `)
    const alertedIds = new Set(alreadyAlerted.map(a => a.rid))

    let created = 0
    for (const residence of atRisk) {
      if (alertedIds.has(String(residence.id))) continue

      await runRun(db,
        `INSERT INTO alerts (type, title, message, source)
         VALUES ($1, $2, $3, $4)`,
        [
          'warning',
          `Alerta de Evacuação - ${residence.neighborhood}`,
          `${residence.name}, o rio atingiu ${currentLevel.toFixed(2)}m em São Jerônimo. ` +
          `Sua residência em ${residence.address} (${residence.neighborhood}) tem nível de alerta em ${residence.evacuation_level}m. ` +
          `Residência #${residence.id}. Prepare-se para evacuar!`,
          'auto'
        ]
      )
      created++
    }

    res.json({
      checked: true,
      riverLevel: currentLevel,
      atRiskCount: atRisk.length,
      alertsCreated: created,
    })
  } catch (error) {
    console.error('Auto alert check error:', error)
    res.status(500).json({ error: 'Erro ao verificar alertas' })
  }
})

export default router
