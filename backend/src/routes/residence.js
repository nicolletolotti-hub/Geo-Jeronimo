import express from 'express'
import jwt from 'jsonwebtoken'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'
import { ResidenceSchema, validateData } from '../utils/validators.js'

const router = express.Router()
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Get user's residence
router.get('/', authenticateToken, async (req, res) => {
  try {
    const residence = await runGet(
      db,
      'SELECT * FROM residences WHERE user_id = $1',
      [req.user.userId]
    )

    if (!residence) {
      return res.status(404).json({ error: 'Residência não encontrada' })
    }

    res.json(residence)
  } catch (error) {
    console.error('Get residence error:', error)
    res.status(500).json({ error: 'Erro ao buscar residência' })
  }
})

// Create/update residence
router.post('/', authenticateToken, async (req, res) => {
  try {
    // Validate input
    const validation = validateData(ResidenceSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const {
      address,
      neighborhood,
      residents,
      comorbidities,
      pets,
      evacuationLogistics,
      shelterPlan,
      preventiveAid,
      floodLevel,
      latitude,
      longitude
    } = validation.data

    // Check if residence already exists
    const existing = await runGet(
      db,
      'SELECT id FROM residences WHERE user_id = $1',
      [req.user.userId]
    )

    if (existing) {
      // Update
      await runRun(
        db,
        `
        UPDATE residences 
        SET address = $1, neighborhood = $2, residents = $3, comorbidities = $4, 
            pets = $5, evacuation_logistics = $6, shelter_plan = $7, preventive_aid = $8,
            flood_level = $9, latitude = $10, longitude = $11, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $12
      `,
        [
          address, neighborhood, residents, comorbidities, pets,
          evacuationLogistics, shelterPlan, preventiveAid, floodLevel,
          latitude, longitude, req.user.userId
        ]
      )

      return res.json({ message: 'Residência atualizada com sucesso' })
    }

    // Create new
    await runRun(
      db,
      `
      INSERT INTO residences 
      (user_id, address, neighborhood, residents, comorbidities, pets, 
       evacuation_logistics, shelter_plan, preventive_aid, flood_level, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        req.user.userId, address, neighborhood, residents, comorbidities, pets,
        evacuationLogistics, shelterPlan, preventiveAid, floodLevel, latitude, longitude
      ]
    )

    res.status(201).json({ message: 'Residência cadastrada com sucesso' })
  } catch (error) {
    console.error('Save residence error:', error)
    res.status(500).json({ error: 'Erro ao salvar residência' })
  }
})

// Get all residences (admin only) - PROTECTED
router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Add pagination
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    const residences = await runQuery(
      db,
      `
      SELECT r.*, u.name, u.email 
      FROM residences r 
      JOIN users u ON r.user_id = u.id
      LIMIT $1 OFFSET $2
    `,
      [limit, offset]
    )

    const countResult = await runGet(
      db,
      'SELECT COUNT(*) as total FROM residences'
    )

    res.json({
      residences,
      pagination: {
        page,
        limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    })
  } catch (error) {
    console.error('Get all residences error:', error)
    res.status(500).json({ error: 'Erro ao buscar residências' })
  }
})

export default router
