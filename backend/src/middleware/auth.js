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

function hasAdminRole(user) {
  return user.role === 'admin' || user.role === 'superadmin' || user.profile === 'ADMIN'
}

export const requireAdmin = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })
  if (hasAdminRole(req.user)) return next()

  const user = await runGet(db, 'SELECT profile FROM users WHERE id = $1', [req.user.userId])
  if (!user || (user.profile !== 'ADMIN' && req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }
  next()
}

export const requireAgent = async (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })
  if (hasAdminRole(req.user)) return next()

  const allowed = ['ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO']
  const user = await runGet(db, 'SELECT profile, agent_status FROM users WHERE id = $1', [req.user.userId])
  if (!user || user.agent_status === 'rejected') {
    return res.status(403).json({ error: 'Acesso restrito a servidores municipais' })
  }
  if (user.agent_status === 'pending') {
    return res.status(403).json({ error: 'Seu cadastro de servidor ainda não foi aprovado' })
  }
  if (!allowed.includes(user.profile)) {
    return res.status(403).json({ error: 'Acesso restrito a servidores municipais' })
  }
  next()
}

export const requireProfile = (allowedProfiles) => {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })
    if (hasAdminRole(req.user)) return next()

    const user = await runGet(db, 'SELECT id, profile, approved_profiles, agent_status FROM users WHERE id = $1', [req.user.userId])
    if (!user) return res.status(401).json({ error: 'Usuário não encontrado' })
    if (user.agent_status === 'rejected') {
      return res.status(403).json({ error: 'Acesso bloqueado' })
    }

    const profiles = safeJson(user.approved_profiles)
    if (user.profile) profiles.push(user.profile)

    const hasAccess = allowedProfiles.some(p => profiles.includes(p))
    if (!hasAccess) {
      return res.status(403).json({ error: `Acesso restrito. Perfis permitidos: ${allowedProfiles.join(', ')}` })
    }

    req.userProfile = user.profile
    req.userApprovedProfiles = profiles
    next()
  }
}

export default {
  authenticateToken,
  requireAdmin,
  requireAgent,
  requireProfile
}
