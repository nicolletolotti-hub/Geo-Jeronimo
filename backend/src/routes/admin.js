import { Router } from 'express'
import db from '../database/db.js'
import { runQuery } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { maskCPF } from '../utils/mask.js'

function maskAuditValues(obj) {
  if (!obj || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(maskAuditValues)
  const result = {}
  for (const [key, val] of Object.entries(obj)) {
    if (typeof val === 'string' && /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(val.replace(/\*\*/g, '00'))) {
      result[key] = maskCPF(val)
    } else if (key.toLowerCase().includes('cpf') && typeof val === 'string') {
      result[key] = maskCPF(val)
    } else if (typeof val === 'object' && val !== null) {
      result[key] = maskAuditValues(val)
    } else {
      result[key] = val
    }
  }
  return result
}

const router = Router()

router.get('/audit-logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50))
    const offset = (page - 1) * limit
    const action = req.query.action || ''
    const entityType = req.query.entity_type || ''

    let sql = 'SELECT * FROM audit_logs WHERE 1=1'
    const params = []

    if (action) {
      sql += ' AND action = $' + (params.length + 1)
      params.push(action)
    }
    if (entityType) {
      sql += ' AND entity_type = $' + (params.length + 1)
      params.push(entityType)
    }

    sql += ' ORDER BY created_at DESC'

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total')
    const totalResult = await runQuery(db, countSql, params)
    const total = totalResult[0]?.total || 0

    sql += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2)
    params.push(limit, offset)

    const logs = await runQuery(db, sql, params)

    res.json({
      logs: logs.map(l => ({
        ...l,
        old_values: l.old_values ? maskAuditValues(tryParse(l.old_values)) : null,
        new_values: l.new_values ? maskAuditValues(tryParse(l.new_values)) : null,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    })
  } catch (error) {
    console.error('Audit logs error:', error)
    res.status(500).json({ error: 'Erro ao buscar logs de auditoria' })
  }
})

router.get('/audit-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const byAction = await runQuery(db, `
      SELECT action, COUNT(*) as count FROM audit_logs
      GROUP BY action ORDER BY count DESC
    `)
    const byEntity = await runQuery(db, `
      SELECT entity_type, COUNT(*) as count FROM audit_logs
      GROUP BY entity_type ORDER BY count DESC
    `)
    const recent = await runQuery(db, `
      SELECT created_at FROM audit_logs ORDER BY created_at DESC LIMIT 1
    `)
    res.json({
      total: await runQuery(db, 'SELECT COUNT(*) as total FROM audit_logs').then(r => r[0]?.total || 0),
      byAction,
      byEntity,
      lastEntry: recent[0]?.created_at || null,
    })
  } catch (error) {
    console.error('Audit summary error:', error)
    res.status(500).json({ error: 'Erro ao buscar resumo de auditoria' })
  }
})

function tryParse(str) {
  try { return JSON.parse(str) } catch { return str }
}

export default router