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
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

router.post('/register', async (req, res) => {
  try {
    const validation = validateData(RegisterSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { email, password, name, phone, agentArea } = validation.data

    const existingUser = await runGet(db, 'SELECT id FROM users WHERE email = $1', [email])
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const role = agentArea ? 'agent' : 'user'

    const result = await runRun(
      db,
      'INSERT INTO users (email, password, name, role, phone, agent_area, agent_status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [email, hashedPassword, name, role, phone || '', agentArea || '', role === 'agent' ? 'pending' : 'approved']
    )

    const token = jwt.sign({
      userId: result.lastID,
      email,
      role
    }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      message: role === 'agent' ? 'Cadastro de agente realizado. Aguarde aprovação do administrador.' : 'Usuário cadastrado com sucesso',
      token,
      user: { id: result.lastID, email, name, role, phone, agentArea, agentStatus: role === 'agent' ? 'pending' : 'approved' }
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

    const { email, password } = validation.data

    const user = await runGet(db, 'SELECT * FROM users WHERE email = $1', [email])
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    if (user.role === 'agent' && user.agent_status === 'pending') {
      return res.status(403).json({ error: 'Seu cadastro de agente ainda não foi aprovado. Aguarde o administrador liberar seu acesso.' })
    }

    const token = jwt.sign({
      userId: user.id,
      email: user.email,
      role: user.role
    }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, agentArea: user.agent_area, agentStatus: user.agent_status }
    })
  } catch (error) {
    logError('Login error:', error)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

router.get('/pending-agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const agents = await runQuery(db,
      `SELECT id, email, name, phone, agent_area, agent_status, created_at
       FROM users WHERE role = 'agent' AND agent_status = 'pending'
       ORDER BY created_at DESC`
    )
    res.json(agents)
  } catch (error) {
    logError('Pending agents error:', error)
    res.status(500).json({ error: 'Erro ao buscar agentes pendentes' })
  }
})

router.get('/agents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const agents = await runQuery(db,
      `SELECT u.id, u.email, u.name, u.phone, u.agent_area, u.agent_status, u.agent_approved_at, u.created_at,
              a.name as approved_by_name
       FROM users u
       LEFT JOIN users a ON u.agent_approved_by = a.id
       WHERE u.role = 'agent'
       ORDER BY u.created_at DESC`
    )
    res.json(agents)
  } catch (error) {
    logError('List agents error:', error)
    res.status(500).json({ error: 'Erro ao listar agentes' })
  }
})

router.post('/approve-agent', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validation = validateData(AgentApprovalSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { userId, action } = validation.data

    const user = await runGet(db, 'SELECT id, role, agent_status FROM users WHERE id = $1', [userId])
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }
    if (user.role !== 'agent') {
      return res.status(400).json({ error: 'Usuário não é um agente' })
    }

    if (action === 'approve') {
      await runRun(db,
        `UPDATE users SET agent_status = 'approved', agent_approved_by = $1, agent_approved_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [req.user.userId, userId]
      )
      res.json({ message: 'Agente aprovado com sucesso' })
    } else {
      await runRun(db,
        `UPDATE users SET agent_status = 'rejected' WHERE id = $1`,
        [userId]
      )
      res.json({ message: 'Agente rejeitado' })
    }
  } catch (error) {
    logError('Approve agent error:', error)
    res.status(500).json({ error: 'Erro ao aprovar/rejeitar agente' })
  }
})

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await runGet(db,
      'SELECT id, email, name, role, phone, agent_area, agent_status FROM users WHERE id = $1',
      [req.user.userId]
    )
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    res.json(user)
  } catch (error) {
    logError('Get me error:', error)
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
  }
})

export default router
