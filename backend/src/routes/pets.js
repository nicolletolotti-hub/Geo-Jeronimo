import express from 'express'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.profile === 'ADMIN') {
      const pets = await runQuery(db, 'SELECT * FROM pets ORDER BY created_at DESC')
      return res.json(pets)
    }
    if (!req.user.cpf) return res.json([])
    const pets = await runQuery(db, 'SELECT * FROM pets WHERE owner_cpf = $1 ORDER BY created_at DESC', [req.user.cpf])
    res.json(pets)
  } catch (error) {
    console.error('List pets error:', error)
    res.status(500).json({ error: 'Erro ao listar pets' })
  }
})

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { ownerName, ownerCpf, ownerAddress, ownerNeighborhood, ownerPhone, ownerLocation, petName, petType, petBreed, petAge, residenceId, notes } = req.body
    if (!ownerName || !ownerCpf || !petName || !petType) {
      return res.status(400).json({ error: 'Nome do dono, CPF, nome do pet e tipo são obrigatórios' })
    }
    const result = await runRun(db,
      `INSERT INTO pets (owner_name, owner_cpf, owner_address, owner_neighborhood, owner_phone, owner_location, pet_name, pet_type, pet_breed, pet_age, residence_id, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [ownerName, ownerCpf, ownerAddress || '', ownerNeighborhood || '', ownerPhone || '', ownerLocation || 'propria_residencia', petName, petType, petBreed || '', petAge || '', residenceId || null, notes || '']
    )
    const pet = await runGet(db, 'SELECT * FROM pets WHERE id = $1', [result.lastID])
    res.status(201).json(pet)
  } catch (error) {
    console.error('Create pet error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar pet' })
  }
})

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const pet = await runGet(db, 'SELECT * FROM pets WHERE id = $1', [req.params.id])
    if (!pet) return res.status(404).json({ error: 'Pet não encontrado' })
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.profile === 'ADMIN'
    if (!isAdmin && pet.owner_cpf !== req.user.cpf) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar este pet' })
    }
    const { ownerName, ownerCpf, ownerAddress, ownerNeighborhood, ownerPhone, ownerLocation, petName, petType, petBreed, petAge, notes } = req.body
    await runRun(db,
      `UPDATE pets SET owner_name=$1, owner_cpf=$2, owner_address=$3, owner_neighborhood=$4, owner_phone=$5, owner_location=$6, pet_name=$7, pet_type=$8, pet_breed=$9, pet_age=$10, notes=$11, updated_at=datetime('now') WHERE id=$12`,
      [ownerName, ownerCpf, ownerAddress, ownerNeighborhood, ownerPhone, ownerLocation, petName, petType, petBreed, petAge, notes, req.params.id]
    )
    const updated = await runGet(db, 'SELECT * FROM pets WHERE id = $1', [req.params.id])
    res.json(updated)
  } catch (error) {
    console.error('Update pet error:', error)
    res.status(500).json({ error: 'Erro ao atualizar pet' })
  }
})

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const pet = await runGet(db, 'SELECT * FROM pets WHERE id = $1', [req.params.id])
    if (!pet) return res.status(404).json({ error: 'Pet não encontrado' })
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.profile === 'ADMIN'
    if (!isAdmin && pet.owner_cpf !== req.user.cpf) {
      return res.status(403).json({ error: 'Você não tem permissão para remover este pet' })
    }
    await runRun(db, 'DELETE FROM pets WHERE id = $1', [req.params.id])
    res.json({ message: 'Pet removido' })
  } catch (error) {
    console.error('Delete pet error:', error)
    res.status(500).json({ error: 'Erro ao remover pet' })
  }
})

router.post('/:id/photo', authenticateToken, async (req, res) => {
  try {
    const { photo } = req.body
    if (!photo) return res.status(400).json({ error: 'Foto é obrigatória' })
    if (photo.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Foto deve ter no máximo 2MB' })
    const pet = await runGet(db, 'SELECT pet_photos FROM pets WHERE id = $1', [req.params.id])
    if (!pet) return res.status(404).json({ error: 'Pet não encontrado' })
    const photos = JSON.parse(pet.pet_photos || '[]')
    if (photos.length >= 5) return res.status(400).json({ error: 'Máximo de 5 fotos por pet' })
    photos.push(photo)
    await runRun(db, 'UPDATE pets SET pet_photos = $1 WHERE id = $2', [JSON.stringify(photos), req.params.id])
    res.json({ message: 'Foto adicionada', photos })
  } catch (error) {
    console.error('Pet photo error:', error)
    res.status(500).json({ error: 'Erro ao adicionar foto' })
  }
})

router.delete('/:id/photo/:index', authenticateToken, async (req, res) => {
  try {
    const pet = await runGet(db, 'SELECT pet_photos FROM pets WHERE id = $1', [req.params.id])
    if (!pet) return res.status(404).json({ error: 'Pet não encontrado' })
    const photos = JSON.parse(pet.pet_photos || '[]')
    const idx = parseInt(req.params.index)
    if (idx < 0 || idx >= photos.length) return res.status(400).json({ error: 'Índice inválido' })
    photos.splice(idx, 1)
    await runRun(db, 'UPDATE pets SET pet_photos = $1 WHERE id = $2', [JSON.stringify(photos), req.params.id])
    res.json({ message: 'Foto removida', photos })
  } catch (error) {
    console.error('Delete pet photo error:', error)
    res.status(500).json({ error: 'Erro ao remover foto' })
  }
})

export default router
