import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { RegisterSchema, LoginSchema, AgentApprovalSchema, validateData } from '../utils/validators.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { logAudit } from '../database/audit.js'
import { maskCPF } from '../utils/mask.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const logFile = path.join(__dirname, '../../../server-error.log')
function logError(...args) {
  try {
    const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? (a.stack || a.message || JSON.stringify(a)) : a).join(' ')}\n`
    fs.appendFileSync(logFile, line)
  } catch {}
  console.error(...args)
}

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[auth] JWT_SECRET environment variable is required')
  process.exit(1)
}

function signTokens(user) {
  const token = jwt.sign({ userId: user.id, cpf: user.cpf, profile: user.profile, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '24h' })
  const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d' })
  return { token, refreshToken }
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
}

function setTokenCookies(res, tokens) {
  res.cookie('token', tokens.token, { ...COOKIE_OPTS, maxAge: 24 * 60 * 60 * 1000 })
  res.cookie('refreshToken', tokens.refreshToken, { ...COOKIE_OPTS, maxAge: 7 * 24 * 60 * 60 * 1000 })
}

function clearTokenCookies(res) {
  res.clearCookie('token', COOKIE_OPTS)
  res.clearCookie('refreshToken', COOKIE_OPTS)
}

function sanitizeUser(user, fullCpf = false) {
  return {
    id: user.id, cpf: fullCpf ? user.cpf : maskCPF(user.cpf), email: user.email, name: user.name,
    profile: user.profile, role: user.role,
    agentArea: user.agent_area, agentStatus: user.agent_status,
    approvedProfiles: safeJson(user.approved_profiles),
    phone: user.phone
  }
}

function safeJson(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

router.post('/register', async (req, res) => {
  try {
    const validation = validateData(RegisterSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { cpf, email, password, name, phone, agentArea, profile } = validation.data

    const existingCpf = await runGet(db, 'SELECT id FROM users WHERE cpf = $1', [cpf])
    if (existingCpf) {
      return res.status(400).json({ error: 'CPF já cadastrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const userProfile = profile || 'CIDADAO'
    const isServer = ['DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO'].includes(userProfile)
    const agentStatus = isServer ? 'pending' : 'approved'

    const result = await runRun(
      db,
      'INSERT INTO users (cpf, email, password, name, role, profile, phone, agent_area, agent_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [cpf, email || '', hashedPassword, name, isServer ? 'agent' : 'user', userProfile, phone || '', agentArea || '', agentStatus]
    )

    const user = await runGet(db, 'SELECT * FROM users WHERE id = $1', [result.lastID])
    const tokens = signTokens(user)

    await logAudit(db, {
      action: 'CREATE', entityType: 'user', entityId: user.id,
      userName: user.name, userProfile: userProfile,
      newValues: { cpf: cpf?.slice(0, 3) + '***', name, profile: userProfile },
      ipAddress: req.ip,
    })

    setTokenCookies(res, tokens)
    res.status(201).json({
      message: isServer ? 'Cadastro de servidor realizado. Aguarde aprovação do administrador.' : 'Cadastro realizado com sucesso',
      ...tokens,
      user: sanitizeUser(user, true)
    })
  } catch (error) {
    logError('Register error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar usuário' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const validation = validateData(LoginSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { cpf, password } = validation.data
    const cleanCpf = cpf.replace(/\D/g, '')

    const user = await runGet(db, 'SELECT * FROM users WHERE cpf = $1', [cleanCpf])
    if (!user) {
      return res.status(401).json({ error: 'CPF ou senha inválidos' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'CPF ou senha inválidos' })
    }

    if ((user.role === 'agent' || user.agent_status === 'pending') && user.agent_status === 'pending') {
      return res.status(403).json({ error: 'Seu cadastro de servidor ainda não foi aprovado. Aguarde o administrador liberar seu acesso.' })
    }

    const tokens = signTokens(user)

    await logAudit(db, {
      userId: user.id, userName: user.name, userProfile: user.profile,
      action: 'LOGIN', entityType: 'user', entityId: user.id,
      ipAddress: req.ip,
    })

    setTokenCookies(res, tokens)
    res.json({
      message: 'Login realizado com sucesso',
      ...tokens,
      user: sanitizeUser(user, true)
    })
  } catch (error) {
    logError('Login error:', error)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

router.get('/pending-agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const agents = await runQuery(db,
      `SELECT id, cpf, email, name, phone, profile, agent_area, agent_status, created_at
       FROM users WHERE agent_status = 'pending' AND role IN ('agent','user')
       ORDER BY created_at DESC`
    )
    res.json(agents.map(a => ({ ...a, cpf: maskCPF(a.cpf) })))
  } catch (error) {
    logError('Pending agents error:', error)
    res.status(500).json({ error: 'Erro ao buscar servidores pendentes' })
  }
})

router.get('/agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const agents = await runQuery(db,
      `SELECT u.id, u.cpf, u.email, u.name, u.phone, u.profile, u.role, u.agent_area, u.agent_status, u.approved_profiles, u.approved_at, u.created_at,
              a.name as approved_by_name
       FROM users u
       LEFT JOIN users a ON u.approved_by = a.id
       WHERE u.agent_status = 'approved' OR u.role = 'agent'
       ORDER BY u.created_at DESC`
    )
    res.json(agents.map(sanitizeUser))
  } catch (error) {
    logError('List agents error:', error)
    res.status(500).json({ error: 'Erro ao listar servidores' })
  }
})

router.post('/approve-agent', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validation = validateData(AgentApprovalSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { userId, action, approvedProfiles } = validation.data

    const user = await runGet(db, 'SELECT id, agent_status FROM users WHERE id = $1', [userId])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

    if (action === 'approve') {
      const profiles = approvedProfiles || []
      const dateField = db.type === 'sqlite' ? "datetime('now')" : 'CURRENT_TIMESTAMP'
      await runRun(db,
        `UPDATE users SET agent_status = 'approved', approved_profiles = $1, approved_by = $2, approved_at = ${dateField} WHERE id = $3`,
        [JSON.stringify(profiles), req.user.userId, userId]
      )
      await logAudit(db, {
        userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
        action: 'UPDATE', entityType: 'user_permission', entityId: userId,
        newValues: { approvedProfiles: profiles, agent_status: 'approved' },
        ipAddress: req.ip,
      })
      res.json({ message: 'Servidor aprovado com sucesso' })
    } else {
      await runRun(db, `UPDATE users SET agent_status = 'rejected' WHERE id = $1`, [userId])
      await logAudit(db, {
        userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
        action: 'UPDATE', entityType: 'user_permission', entityId: userId,
        newValues: { agent_status: 'rejected' },
        ipAddress: req.ip,
      })
      res.json({ message: 'Servidor rejeitado' })
    }
  } catch (error) {
    logError('Approve agent error:', error)
    res.status(500).json({ error: 'Erro ao aprovar/rejeitar servidor' })
  }
})

router.post('/request-profile', authenticateToken, async (req, res) => {
  try {
    const { profile } = req.body
    if (!profile) return res.status(400).json({ error: 'Perfil é obrigatório' })
    if (!['DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO'].includes(profile)) {
      return res.status(400).json({ error: 'Perfil inválido' })
    }

    const user = await runGet(db, 'SELECT * FROM users WHERE id = $1', [req.user.userId])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

    const currentProfiles = safeJson(user.approved_profiles)
    if (currentProfiles.includes(profile)) {
      return res.json({ message: 'Perfil já solicitado ou aprovado', user: sanitizeUser(user, true) })
    }

    await runRun(db, "UPDATE users SET agent_status = 'pending', profile = $1 WHERE id = $2", [profile, req.user.userId])
    const updated = await runGet(db, 'SELECT * FROM users WHERE id = $1', [req.user.userId])

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'UPDATE', entityType: 'user_permission', entityId: req.user.userId,
      newValues: { requestedProfile: profile, agent_status: 'pending' },
      ipAddress: req.ip,
    })

    res.json({ message: 'Solicitação de perfil de servidor enviada. Aguarde aprovação.', user: sanitizeUser(updated, true) })
  } catch (error) {
    logError('Request profile error:', error)
    res.status(500).json({ error: 'Erro ao solicitar perfil' })
  }
})

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await runGet(db, 'SELECT * FROM users WHERE id = $1', [req.user.userId])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(sanitizeUser(user, true))
  } catch (error) {
    logError('Get me error:', error)
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
  }
})

router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' })
    if (newPassword.length < 6) return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' })

    const user = await runGet(db, 'SELECT password FROM users WHERE id = $1', [req.user.userId])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await runRun(db, 'UPDATE users SET password = $1 WHERE id = $2', [hashed, req.user.userId])

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'UPDATE', entityType: 'user', entityId: req.user.userId,
      ipAddress: req.ip,
    })

    res.json({ message: 'Senha alterada com sucesso' })
  } catch (error) {
    logError('Change password error:', error)
    res.status(500).json({ error: 'Erro ao alterar senha' })
  }
})

router.post('/refresh-token', async (req, res) => {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token não fornecido' })

    const decoded = jwt.verify(refreshToken, JWT_SECRET)
    if (decoded.type !== 'refresh') return res.status(403).json({ error: 'Token inválido' })

    const user = await runGet(db, 'SELECT * FROM users WHERE id = $1', [decoded.userId])
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

    const tokens = signTokens(user)
    setTokenCookies(res, tokens)
    res.json({ ...tokens, user: sanitizeUser(user, true) })
  } catch {
    res.status(403).json({ error: 'Refresh token inválido ou expirado' })
  }
})

router.post('/logout', (req, res) => {
  clearTokenCookies(res)
  res.json({ message: 'Logout realizado com sucesso' })
})

export default router
