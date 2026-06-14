import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required')
  process.exit(1)
}

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido ou expirado' })
    }
    req.user = user
    next()
  })
}

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a administradores' })
  }

  next()
}

export const requireAgent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  if (!['admin', 'superadmin', 'agent'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Acesso restrito a agentes municipais' })
  }

  next()
}

export const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Acesso restrito a superadministradores' })
  }

  next()
}

export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Token não fornecido' })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Acesso restrito. Roles permitidas: ${allowedRoles.join(', ')}` })
    }

    next()
  }
}

export default {
  authenticateToken,
  requireAdmin,
  requireAgent,
  requireSuperAdmin,
  requireRole
}
