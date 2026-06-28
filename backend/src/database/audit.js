import { runRun } from './helpers.js'

/**
 * Registra uma entrada no log de auditoria.
 * Nunca lança exceção — falhas são apenas logadas no console.
 */
export async function logAudit(db, {
  userId,
  userName,
  userProfile,
  action,
  entityType,
  entityId,
  oldValues,
  newValues,
  ipAddress,
}) {
  try {
    await runRun(
      db,
      `INSERT INTO audit_logs
         (user_id, user_name, user_profile, action, entity_type, entity_id,
          old_values, new_values, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
      [
        userId   ?? null,
        userName || 'desconhecido',
        userProfile || null,
        action,
        entityType,
        entityId ?? null,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress || null,
      ],
    )
  } catch (err) {
    console.error('[audit] log error:', err.message)
  }
}
