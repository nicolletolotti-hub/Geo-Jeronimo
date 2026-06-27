import jwt from 'jsonwebtoken'
import db from '../database/db.js'
import { runGet } from '../database/helpers.js'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}

function safeJson(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token não fornecido' })

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado' })
    req.user = user
    next()
  })
}

export const requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })
  if (req.user.profile !== 'ADMIN' && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }
  next()
}

export const requireAgent = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })
  const allowed = ['ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO']
  if (!allowed.includes(req.user.profile) && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a servidores municipais' })
  }
  next()
}

export const requireProfile = (allowedProfiles) => {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })
    if (req.user.role === 'admin' || req.user.role === 'superadmin') return next()

    const user = await runGet(db, 'SELECT approved_profiles, profile FROM users WHERE id = $1', [req.user.userId])
    const profiles = safeJson(user?.approved_profiles)
    profiles.push(user?.profile)
    const hasAccess = allowedProfiles.some(p => profiles.includes(p))
    if (!hasAccess) {
      return res.status(403).json({ error: `Acesso restrito. Perfis permitidos: ${allowedProfiles.join(', ')}` })
    }
    next()
  }
}

export default {
  authenticateToken,
  requireAdmin,
  requireAgent,
  requireProfile
}
