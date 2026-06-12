import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { RegisterSchema, LoginSchema, validateData } from '../utils/validators.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Register
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const validation = validateData(RegisterSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { email, password, name } = validation.data

    // Check if user already exists
    const existingUser = await runGet(db, 'SELECT id FROM users WHERE email = $1', [email])
    if (existingUser) {
      return res.status(400).json({ error: 'Email já cadastrado' })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user with default 'user' role
    const result = await runRun(
      db,
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [email, hashedPassword, name, 'user']
    )

    // Generate token
    const token = jwt.sign({ 
      userId: result.lastID, 
      email,
      role: 'user'
    }, JWT_SECRET, { expiresIn: '7d' })

    res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      token,
      user: { id: result.lastID, email, name, role: 'user' }
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar usuário' })
  }
})

// Login
router.post('/login', async (req, res) => {
  try {
    // Validate input
    const validation = validateData(LoginSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { email, password } = validation.data

    // Find user
    const user = await runGet(db, 'SELECT * FROM users WHERE email = $1', [email])
    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' })
    }

    // Generate token with role
    const token = jwt.sign({ 
      userId: user.id, 
      email: user.email,
      role: user.role
    }, JWT_SECRET, { expiresIn: '7d' })

    res.json({
      message: 'Login realizado com sucesso',
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

export default router
