import express from 'express'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const router = express.Router()

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const list = await runQuery(db, 'SELECT * FROM belongings ORDER BY created_at DESC')
    res.json(list)
  } catch (error) {
    console.error('List belongings error:', error)
    res.status(500).json({ error: 'Erro ao listar pertences' })
  }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { familyName, familyCpf, familyPhone, registrationNumber, items, storageLocation, shelterId, notes } = req.body
    if (!familyName) return res.status(400).json({ error: 'Nome da família é obrigatório' })
    const itemsJson = JSON.stringify(items || [])
    const result = await runRun(db,
      `INSERT INTO belongings (family_name, family_cpf, family_phone, registration_number, items, storage_location, shelter_id, notes, registered_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [familyName, familyCpf || '', familyPhone || '', registrationNumber || '', itemsJson, storageLocation || '', shelterId || null, notes || '', req.user.userId]
    )
    const record = await runGet(db, 'SELECT * FROM belongings WHERE id = $1', [result.lastID])
    res.status(201).json(record)
  } catch (error) {
    console.error('Create belonging error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar pertences' })
  }
})

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { familyName, familyCpf, familyPhone, registrationNumber, items, storageLocation, shelterId, notes } = req.body
    const itemsJson = JSON.stringify(items || [])
    await runRun(db,
      `UPDATE belongings SET family_name=$1, family_cpf=$2, family_phone=$3, registration_number=$4, items=$5, storage_location=$6, shelter_id=$7, notes=$8, updated_at=datetime('now') WHERE id=$9`,
      [familyName, familyCpf, familyPhone, registrationNumber, itemsJson, storageLocation, shelterId, notes, req.params.id]
    )
    const record = await runGet(db, 'SELECT * FROM belongings WHERE id = $1', [req.params.id])
    res.json(record)
  } catch (error) {
    console.error('Update belonging error:', error)
    res.status(500).json({ error: 'Erro ao atualizar pertences' })
  }
})

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await runRun(db, 'DELETE FROM belongings WHERE id = $1', [req.params.id])
    res.json({ message: 'Registro removido' })
  } catch (error) {
    console.error('Delete belonging error:', error)
    res.status(500).json({ error: 'Erro ao remover registro' })
  }
})

router.post('/:id/photo', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { photo } = req.body
    if (!photo) return res.status(400).json({ error: 'Foto é obrigatória' })
    if (photo.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Foto deve ter no máximo 2MB' })
    const record = await runGet(db, 'SELECT photos FROM belongings WHERE id = $1', [req.params.id])
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' })
    const photos = JSON.parse(record.photos || '[]')
    if (photos.length >= 10) return res.status(400).json({ error: 'Máximo de 10 fotos por registro' })
    photos.push(photo)
    await runRun(db, 'UPDATE belongings SET photos = $1 WHERE id = $2', [JSON.stringify(photos), req.params.id])
    res.json({ message: 'Foto adicionada', photos })
  } catch (error) {
    console.error('Belonging photo error:', error)
    res.status(500).json({ error: 'Erro ao adicionar foto' })
  }
})

router.delete('/:id/photo/:index', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const record = await runGet(db, 'SELECT photos FROM belongings WHERE id = $1', [req.params.id])
    if (!record) return res.status(404).json({ error: 'Registro não encontrado' })
    const photos = JSON.parse(record.photos || '[]')
    const idx = parseInt(req.params.index)
    if (idx < 0 || idx >= photos.length) return res.status(400).json({ error: 'Índice inválido' })
    photos.splice(idx, 1)
    await runRun(db, 'UPDATE belongings SET photos = $1 WHERE id = $2', [JSON.stringify(photos), req.params.id])
    res.json({ message: 'Foto removida', photos })
  } catch (error) {
    console.error('Delete belonging photo error:', error)
    res.status(500).json({ error: 'Erro ao remover foto' })
  }
})

export default router
