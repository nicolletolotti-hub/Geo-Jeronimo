import jwt from 'jsonwebtoken'
import db from '../database/db.js'

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
  let token = authHeader && authHeader.split(' ')[1]
  if (!token) token = req.cookies?.token
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
  try {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })

    // Fast path for admin roles in the token
    if (req.user.role === 'admin' || req.user.role === 'superadmin') {
      return next()
    }

    // Fallback to check the profile in the database
    const result = await db.query('SELECT profile FROM users WHERE id = $1', [req.user.userId])
    const dbUser = result.rows[0]

    if (!dbUser || dbUser.profile !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso restrito a administradores' })
    }

    return next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'Erro interno de autenticação' })
  }
}

const AGENT_PROFILES = ['ADMIN', 'DEFESA_CIVIL', 'SAUDE', 'ASSISTENCIA_SOCIAL', 'DEFESA_ANIMAL', 'AGENTE_CAMPO']

export const requireAgent = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })

    // Admins always have access.
    if (hasAdminRole(req.user)) return next()

    const result = await db.query('SELECT profile, agent_status FROM users WHERE id = $1', [req.user.userId])
    const dbUser = result.rows[0]

    if (!dbUser) return res.status(401).json({ error: 'Usuário não encontrado' })
    if (dbUser.agent_status === 'rejected') return res.status(403).json({ error: 'Acesso bloqueado' })
    if (dbUser.agent_status === 'pending') return res.status(403).json({ error: 'Seu cadastro de servidor ainda não foi aprovado' })
    if (!AGENT_PROFILES.includes(dbUser.profile)) return res.status(403).json({ error: 'Acesso restrito a servidores municipais' })

    return next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'Erro interno de autenticação' })
  }
}

export const requireProfile = (allowedProfiles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Token não fornecido' })

      // Admins always have access.
      if (hasAdminRole(req.user)) return next()

      const result = await db.query('SELECT profile, approved_profiles, agent_status FROM users WHERE id = $1', [req.user.userId])
      const dbUser = result.rows[0]

      if (!dbUser) return res.status(401).json({ error: 'Usuário não encontrado' })
      if (dbUser.agent_status === 'rejected') return res.status(403).json({ error: 'Acesso bloqueado' })
      if (dbUser.agent_status === 'pending') return res.status(403).json({ error: 'Seu cadastro de servidor ainda não foi aprovado' })

      const profiles = safeJson(dbUser.approved_profiles)
      if (dbUser.profile) profiles.push(dbUser.profile)

      const hasAccess = allowedProfiles.some(p => profiles.includes(p))
      if (!hasAccess) {
        return res.status(403).json({
          error: `Acesso restrito. Perfis permitidos: ${allowedProfiles.join(', ')}`
        })
      }

      req.userProfile = dbUser.profile
      req.userApprovedProfiles = profiles
      return next()
    } catch (err) {
      console.error('Auth middleware error:', err)
      return res.status(500).json({ error: 'Erro interno de autenticação' })
    }
  }
}

export default {
  authenticateToken,
  requireAdmin,
  requireAgent,
  requireProfile
}
