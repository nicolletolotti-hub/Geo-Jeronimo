import { runRun } from './helpers.js'

export async function logAudit(db, { userId, userName, userProfile, action, entityType, entityId, oldValues, newValues, ipAddress }) {
  try {
    const now = db.type === 'sqlite' ? "datetime('now')" : 'CURRENT_TIMESTAMP'
    await runRun(db,
      `INSERT INTO audit_logs (user_id, user_name, user_profile, action, entity_type, entity_id, old_values, new_values, ip_address, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${now})`,
      [
        userId ?? null,
        userName || 'desconhecido',
        userProfile || null,
        action,
        entityType,
        entityId ?? null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
      ]
    )
  } catch (err) {
    console.error('audit log error:', err.message)
  }
}