import express from 'express'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin, requireAgent } from '../middleware/auth.js'
import { ResidenceSchema, AgentResidenceSchema, EvacuationStatusSchema, ImportRowSchema, validateData } from '../utils/validators.js'
import { validarCoordenadas } from '../utils/geo.js'
import { logAudit } from '../database/audit.js'
import { findAffectedLevel } from '../utils/floodRisk.js'
import { geocodeBatch } from '../utils/nominatimGeocoder.js'

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

const RESIDENCE_COLS = `
  house_number, address, neighborhood, residents, comorbidities,
  has_elderly, has_children, has_pregnant, has_disabled,
  comorbidade_respiratoria, comorbidade_cardiaca, comorbidade_diabetes,
  comorbidade_renal, comorbidade_neurologica, comorbidade_mobilidade,
  comorbidade_saude_mental, comorbidade_alergias, comorbidade_oxigenio, comorbidade_quimioterapia,
  telefone_contato, telefone_emergencia, possui_veiculo,
  possui_animais_grande_porte, acesso_superior, medicamentos_continuos,
  necessita_energia, abrigo_preferencial, pontos_referencia,
  pets, evacuation_logistics, shelter_plan, preventive_aid,
  flood_level, evacuation_level, latitude, longitude,
  evacuation_status, agent_notes, shelter_name,
  health_markers, household_members, emergency_contact_name, emergency_contact_phone,
  needs_evacuation_help, evacuation_reason, needs_truck,
  pets_info, shelter_destination, registration_step, registration_complete
`

const RESIDENCE_PARAMS = `
  $2, $3, $4, $5, $6,
  $7, $8, $9, $10,
  $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
  $21, $22, $23, $24, $25, $26, $27, $28, $29,
  $30, $31, $32, $33,
  $34, $35, $36, $37,
  $38, $39, $40, $41, $42, $43, $44,
  $45, $46, $47, $48, $49, $50, $51
`

function bool(v) { return v ? 1 : 0 }

function extractResidenceData(data, extra = {}) {
  return [
    data.houseNumber || '', data.address, data.neighborhood, data.residents, data.comorbidities || '',
    bool(data.hasElderly), bool(data.hasChildren), bool(data.hasPregnant), bool(data.hasDisabled),
    bool(data.comorbidadeRespiratoria), bool(data.comorbidadeCardiaca), bool(data.comorbidadeDiabetes),
    bool(data.comorbidadeRenal), bool(data.comorbidadeNeurologica), bool(data.comorbidadeMobilidade),
    bool(data.comorbidadeSaudeMental), bool(data.comorbidadeAlergias), bool(data.comorbidadeOxigenio), bool(data.comorbidadeQuimioterapia),
    data.telefoneContato || '', data.telefoneEmergencia || '', bool(data.possuiVeiculo),
    bool(data.possuiAnimaisGrandePorte), bool(data.acessoSuperior), data.medicamentosContinuos || '',
    bool(data.necessitaEnergia), data.abrigoPreferencial || '', data.pontosReferencia || '',
    data.pets || '', data.evacuationLogistics, data.shelterPlan, data.preventiveAid || '',
    data.floodLevel != null ? data.floodLevel : 10, data.evacuationLevel ?? null, data.latitude ?? null, data.longitude ?? null,
    extra.evacuationStatus || 'unknown', extra.agentNotes || '', extra.shelterName || '',
    data.healthMarkers || '[]', data.householdMembers || '[]', data.emergencyContactName || '', data.emergencyContactPhone || '',
    bool(data.needsEvacuationHelp), data.evacuationReason || '', bool(data.needsTruck),
    data.petsInfo || '[]', data.shelterDestination || '', data.registrationStep || 7, data.registrationComplete ? 1 : 0,
  ]
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const residence = await runGet(
      db, `SELECT * FROM residences WHERE user_id = $1`, [req.user.userId]
    )
    if (!residence) {
      return res.status(404).json({ error: 'Residência não encontrada' })
    }
    res.json(residence)
  } catch (error) {
    logError('Get residence error:', error)
    res.status(500).json({ error: 'Erro ao buscar residência' })
  }
})

router.delete('/', authenticateToken, async (req, res) => {
  try {
    const existing = await runGet(db, 'SELECT id, address, neighborhood FROM residences WHERE user_id = $1', [req.user.userId])
    if (!existing) return res.status(404).json({ error: 'Residência não encontrada' })
    await runRun(db, 'DELETE FROM residences WHERE id = $1', [existing.id])
    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'DELETE', entityType: 'residence', entityId: existing.id,
      oldValues: { address: existing.address, neighborhood: existing.neighborhood },
      ipAddress: req.ip,
    })
    res.json({ message: 'Residência removida' })
  } catch (error) {
    logError('Delete my residence error:', error)
    res.status(500).json({ error: 'Erro ao remover residência' })
  }
})

router.post('/photo', authenticateToken, async (req, res) => {
  try {
    const { photo } = req.body
    if (!photo || typeof photo !== 'string' || !photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Foto inválida. Envie uma imagem base64 (data:image/...)' })
    }
    if (photo.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Foto muito grande. Máximo 2MB.' })
    }
    const residence = await runGet(db, 'SELECT id, prescription_photos FROM residences WHERE user_id = $1', [req.user.userId])
    const residenceId = residence?.id
    if (!residenceId) return res.status(404).json({ error: 'Residência não encontrada' })

    const photos = JSON.parse(residence.prescription_photos || '[]')
    if (photos.length >= 5) return res.status(400).json({ error: 'Máximo de 5 fotos por residência' })
    photos.push(photo)
    await runRun(db, 'UPDATE residences SET prescription_photos = $1 WHERE id = $2', [JSON.stringify(photos), residenceId])
    res.json({ photos, message: 'Foto adicionada' })
  } catch (error) {
    logError('Upload photo error:', error)
    res.status(500).json({ error: 'Erro ao salvar foto' })
  }
})

router.delete('/photo/:index', authenticateToken, async (req, res) => {
  try {
    const idx = parseInt(req.params.index)
    const residence = await runGet(db, 'SELECT id, prescription_photos FROM residences WHERE user_id = $1', [req.user.userId])
    const residenceId = residence?.id
    if (!residenceId) return res.status(404).json({ error: 'Residência não encontrada' })
    const photos = JSON.parse(residence.prescription_photos || '[]')
    if (idx < 0 || idx >= photos.length) return res.status(400).json({ error: 'Índice inválido' })
    photos.splice(idx, 1)
    await runRun(db, 'UPDATE residences SET prescription_photos = $1 WHERE id = $2', [JSON.stringify(photos), residenceId])
    res.json({ photos, message: 'Foto removida' })
  } catch (error) {
    logError('Delete photo error:', error)
    res.status(500).json({ error: 'Erro ao remover foto' })
  }
})

router.post('/', authenticateToken, async (req, res) => {
  try {
    const validation = validateData(ResidenceSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const data = validation.data
    if (data.latitude != null && data.longitude != null) {
      const coordCheck = validarCoordenadas(data.latitude, data.longitude)
      if (!coordCheck.valido) return res.status(400).json({ error: coordCheck.erro })
    }
    data.evacuationLogistics = data.evacuationLogistics || 'vehicle'
    data.shelterPlan = data.shelterPlan || 'relatives'
    const existing = await runGet(db, 'SELECT id FROM residences WHERE user_id = $1', [req.user.userId])

    if (existing) {
      const oldRes = await runGet(db, 'SELECT address, neighborhood, flood_level, evacuation_status, residents FROM residences WHERE id = $1', [existing.id])
      await runRun(db, `
        UPDATE residences SET
          house_number=$1, address=$2, neighborhood=$3, residents=$4, comorbidities=$5,
          has_elderly=$6, has_children=$7, has_pregnant=$8, has_disabled=$9,
          comorbidade_respiratoria=$10, comorbidade_cardiaca=$11, comorbidade_diabetes=$12,
          comorbidade_renal=$13, comorbidade_neurologica=$14, comorbidade_mobilidade=$15,
          comorbidade_saude_mental=$16, comorbidade_alergias=$17, comorbidade_oxigenio=$18, comorbidade_quimioterapia=$19,
          telefone_contato=$20, telefone_emergencia=$21, possui_veiculo=$22,
          possui_animais_grande_porte=$23, acesso_superior=$24, medicamentos_continuos=$25,
          necessita_energia=$26, abrigo_preferencial=$27, pontos_referencia=$28,
          pets=$29, evacuation_logistics=$30, shelter_plan=$31, preventive_aid=$32,
          flood_level=$33, evacuation_level=$34, latitude=$35, longitude=$36,
          health_markers=$37, household_members=$38, emergency_contact_name=$39, emergency_contact_phone=$40,
          needs_evacuation_help=$41, evacuation_reason=$42, needs_truck=$43,
          pets_info=$44, shelter_destination=$45, registration_step=$46, registration_complete=$47,
          updated_at=CURRENT_TIMESTAMP
        WHERE user_id=$48
      `, [
        data.houseNumber || '', data.address, data.neighborhood, data.residents, data.comorbidities || '',
        bool(data.hasElderly), bool(data.hasChildren), bool(data.hasPregnant), bool(data.hasDisabled),
        bool(data.comorbidadeRespiratoria), bool(data.comorbidadeCardiaca), bool(data.comorbidadeDiabetes),
        bool(data.comorbidadeRenal), bool(data.comorbidadeNeurologica), bool(data.comorbidadeMobilidade),
        bool(data.comorbidadeSaudeMental), bool(data.comorbidadeAlergias), bool(data.comorbidadeOxigenio), bool(data.comorbidadeQuimioterapia),
        data.telefoneContato || '', data.telefoneEmergencia || '', bool(data.possuiVeiculo),
        bool(data.possuiAnimaisGrandePorte), bool(data.acessoSuperior), data.medicamentosContinuos || '',
        bool(data.necessitaEnergia), data.abrigoPreferencial || '', data.pontosReferencia || '',
        data.pets || '', data.evacuationLogistics, data.shelterPlan, data.preventiveAid || '',
        data.floodLevel != null ? data.floodLevel : 10, data.evacuationLevel ?? null, data.latitude ?? null, data.longitude ?? null,
        data.healthMarkers || '[]', data.householdMembers || '[]', data.emergencyContactName || '', data.emergencyContactPhone || '',
        bool(data.needsEvacuationHelp), data.evacuationReason || '', bool(data.needsTruck),
        data.petsInfo || '[]', data.shelterDestination || '', data.registrationStep || 7, data.registrationComplete ? 1 : 0,
        req.user.userId
      ])
      await logAudit(db, {
        userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
        action: 'UPDATE', entityType: 'residence', entityId: existing.id,
        oldValues: oldRes ? { address: oldRes.address, neighborhood: oldRes.neighborhood, flood_level: oldRes.flood_level, evacuation_status: oldRes.evacuation_status } : undefined,
        newValues: { address: data.address, neighborhood: data.neighborhood, flood_level: data.floodLevel, evacuation_status: data.evacuationStatus },
        ipAddress: req.ip,
      })
      return res.json({ message: 'Residência atualizada com sucesso' })
    }

    const insResult = await runRun(db, `
      INSERT INTO residences (user_id, ${RESIDENCE_COLS})
      VALUES ($1, ${RESIDENCE_PARAMS}) RETURNING id
    `, [req.user.userId, ...extractResidenceData(data)])

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'CREATE', entityType: 'residence', entityId: insResult.lastID,
      newValues: { address: data.address, neighborhood: data.neighborhood, flood_level: data.floodLevel },
      ipAddress: req.ip,
    })

    res.status(201).json({ message: 'Residência cadastrada com sucesso' })
  } catch (error) {
    logError('Save residence error:', error)
    res.status(500).json({ error: 'Erro ao salvar residência' })
  }
})

router.get('/all', authenticateToken, requireAgent, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const offset = (page - 1) * limit

    let whereClause = ''
    const params = []
    let paramIdx = 0

    if (req.query.status) {
      paramIdx++
      whereClause += ` WHERE r.evacuation_status = $${paramIdx}`
      params.push(req.query.status)
    }
    if (req.query.vulnerable === 'true') {
      whereClause += whereClause ? ' AND' : ' WHERE'
      whereClause += ` (r.has_elderly = true OR r.has_children = true OR r.has_pregnant = true OR r.has_disabled = true)`
    }
    if (req.query.neighborhood) {
      paramIdx++
      whereClause += whereClause ? ' AND' : ' WHERE'
      whereClause += ` r.neighborhood = $${paramIdx}`
      params.push(req.query.neighborhood)
    }

    paramIdx++
    params.push(limit)
    paramIdx++
    params.push(offset)

    const residences = await runQuery(db, `
      SELECT r.*, u.name, u.email
      FROM residences r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${paramIdx - 1} OFFSET $${paramIdx}
    `, params)

    const countResult = await runGet(db, 'SELECT COUNT(*) as total FROM residences')

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'VIEW', entityType: 'residence', entityId: null,
      newValues: { filter: req.query.status || 'all', page, limit },
      ipAddress: req.ip,
    })

    res.json({
      residences,
      pagination: {
        page, limit,
        total: countResult.total,
        pages: Math.ceil(countResult.total / limit)
      }
    })
  } catch (error) {
    logError('Get all residences error:', error)
    res.status(500).json({ error: 'Erro ao buscar residências' })
  }
})

router.get('/evacuation-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const summary = await runQuery(db, `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN evacuation_status = 'not_rescued' THEN 1 ELSE 0 END) as not_rescued,
        SUM(CASE WHEN evacuation_status = 'evacuated' THEN 1 ELSE 0 END) as evacuated,
        SUM(CASE WHEN evacuation_status = 'in_shelter' THEN 1 ELSE 0 END) as in_shelter,
        SUM(CASE WHEN evacuation_status = 'with_family' THEN 1 ELSE 0 END) as with_family,
        SUM(CASE WHEN evacuation_status = 'unknown' THEN 1 ELSE 0 END) as unknown_status,
        SUM(CASE WHEN has_elderly = 1 THEN 1 ELSE 0 END) as has_elderly,
        SUM(CASE WHEN has_children = 1 THEN 1 ELSE 0 END) as has_children,
        SUM(CASE WHEN has_pregnant = 1 THEN 1 ELSE 0 END) as has_pregnant,
        SUM(CASE WHEN has_disabled = 1 THEN 1 ELSE 0 END) as has_disabled,
        SUM(CASE WHEN flood_level <= 4 THEN 1 ELSE 0 END) as high_risk,
        SUM(CASE WHEN evacuation_logistics = 'boat' THEN 1 ELSE 0 END) as needs_boat
      FROM residences
    `)
    res.json(summary[0] || {})
  } catch (error) {
    logError('Evacuation summary error:', error)
    res.status(500).json({ error: 'Erro ao gerar resumo' })
  }
})

router.get('/neighborhood-summary', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const summary = await runQuery(db, `
      SELECT
        neighborhood,
        COUNT(*) as total,
        SUM(CASE WHEN has_elderly = 1 OR has_children = 1 OR has_pregnant = 1 OR has_disabled = 1 THEN 1 ELSE 0 END) as vulneraveis,
        SUM(CASE WHEN flood_level <= 4 THEN 1 ELSE 0 END) as alto_risco,
        SUM(CASE WHEN evacuation_status = 'not_rescued' THEN 1 ELSE 0 END) as nao_resgatados,
        SUM(CASE WHEN evacuation_status IN ('evacuated','in_shelter','with_family') THEN 1 ELSE 0 END) as resgatados,
        SUM(CASE WHEN evacuation_status = 'unknown' THEN 1 ELSE 0 END) as desconhecidos,
        SUM(CASE WHEN evacuation_logistics = 'boat' THEN 1 ELSE 0 END) as precisa_barco,
        SUM(CASE WHEN necessita_energia = 1 THEN 1 ELSE 0 END) as depende_energia,
        SUM(CASE WHEN possui_animais_grande_porte = 1 THEN 1 ELSE 0 END) as animais_grande_porte
      FROM residences
      GROUP BY neighborhood
      ORDER BY COUNT(*) DESC
    `)
    res.json(summary)
  } catch (error) {
    logError('Neighborhood summary error:', error)
    res.status(500).json({ error: 'Erro ao gerar resumo por bairro' })
  }
})

router.get('/priority', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const neighborhood = req.query.neighborhood

    let whereClause = ''
    const params = []
    if (neighborhood) {
      whereClause = 'WHERE r.neighborhood = $1'
      params.push(neighborhood)
    }

    const residences = await runQuery(db, `
      SELECT r.*, u.name, u.email, u.phone
      FROM residences r
      JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY
        CASE WHEN r.evacuation_status = 'not_rescued' THEN 0 ELSE 1 END,
        CASE WHEN r.has_elderly = true THEN 0 ELSE 1 END +
        CASE WHEN r.has_disabled = true THEN 0 ELSE 1 END +
        CASE WHEN r.has_children = true THEN 0 ELSE 1 END +
        CASE WHEN r.has_pregnant = true THEN 0 ELSE 1 END +
        CASE WHEN r.comorbidade_mobilidade = true THEN 0 ELSE 1 END +
        CASE WHEN r.comorbidade_oxigenio = true THEN 0 ELSE 1 END +
        CASE WHEN r.comorbidade_quimioterapia = true THEN 0 ELSE 1 END +
        CASE WHEN r.necessita_energia = true THEN 0 ELSE 1 END,
        r.flood_level ASC,
        r.created_at ASC
    `, params)

    const ranked = residences.map((r, i) => ({
      ...r,
      prioridade: i + 1,
      score_urgencia: (
        (r.has_elderly ? 3 : 0) +
        (r.has_disabled ? 3 : 0) +
        (r.has_children ? 2 : 0) +
        (r.has_pregnant ? 3 : 0) +
        (r.comorbidade_mobilidade ? 3 : 0) +
        (r.comorbidade_oxigenio ? 4 : 0) +
        (r.comorbidade_quimioterapia ? 2 : 0) +
        (r.necessita_energia ? 3 : 0) +
        (r.flood_level <= 4 ? 3 : r.flood_level <= 7 ? 2 : 0) +
        (r.evacuation_status === 'not_rescued' ? 5 : 0) +
        (r.evacuation_logistics === 'boat' ? 2 : 0)
      )
    }))

    ranked.sort((a, b) => b.score_urgencia - a.score_urgencia)
    ranked.forEach((r, i) => { r.prioridade = i + 1 })

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'VIEW', entityType: 'residence', entityId: null,
      newValues: { view: 'priority', neighborhood: req.query.neighborhood || 'all', count: ranked.length },
      ipAddress: req.ip,
    })

    res.json(ranked)
  } catch (error) {
    logError('Priority error:', error)
    res.status(500).json({ error: 'Erro ao calcular prioridades' })
  }
})

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const existing = await runGet(db, 'SELECT id, address, neighborhood FROM residences WHERE id = $1', [id])
    if (!existing) return res.status(404).json({ error: 'Residência não encontrada' })
    await runRun(db, 'DELETE FROM residences WHERE id = $1', [id])
    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'DELETE', entityType: 'residence', entityId: id,
      oldValues: { address: existing.address, neighborhood: existing.neighborhood },
      ipAddress: req.ip,
    })
    res.json({ message: 'Residência removida' })
  } catch (error) {
    logError('Delete residence error:', error)
    res.status(500).json({ error: 'Erro ao remover residência' })
  }
})

router.put('/:id/status', authenticateToken, requireAgent, async (req, res) => {
  try {
    const validation = validateData(EvacuationStatusSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const { evacuationStatus, shelterName, agentNotes } = validation.data
    const residenceId = parseInt(req.params.id)

    const existing = await runGet(db, 'SELECT id, evacuation_status, address FROM residences WHERE id = $1', [residenceId])
    if (!existing) return res.status(404).json({ error: 'Residência não encontrada' })

    await runRun(db, `
      UPDATE residences SET
        evacuation_status = $1, shelter_name = $2, agent_notes = $3,
        registered_by = 'agent', updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [evacuationStatus, shelterName || '', agentNotes || '', residenceId])

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'UPDATE', entityType: 'residence', entityId: residenceId,
      oldValues: { evacuation_status: existing.evacuation_status },
      newValues: { evacuation_status: evacuationStatus, shelter_name: shelterName },
      ipAddress: req.ip,
    })

    res.json({ message: 'Status de evacuação atualizado' })
  } catch (error) {
    logError('Update evacuation status error:', error)
    res.status(500).json({ error: 'Erro ao atualizar status' })
  }
})

router.post('/agent-register', authenticateToken, requireAgent, async (req, res) => {
  try {
    const validation = validateData(AgentResidenceSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const data = validation.data
    let targetUserId = data.userId

    if (!targetUserId) {
      const email = data.userEmail || `cidadao_${Date.now()}@geojeronimo.app`
      const name = data.userName || 'Cidadão'
      const tempPassword = await bcrypt.hash(crypto.randomUUID(), 10)

      const existingUser = await runGet(db, 'SELECT id FROM users WHERE email = $1', [email])
      if (existingUser) {
        targetUserId = existingUser.id
      } else {
        const result = await runRun(db,
          'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
          [email, tempPassword, name, 'user']
        )
        targetUserId = result.lastID
      }
    }

    const existing = await runGet(db, 'SELECT id FROM residences WHERE user_id = $1', [targetUserId])
    if (existing) {
      return res.status(400).json({ error: 'Cidadão já possui residência cadastrada' })
    }

    const agResult = await runRun(db, `
      INSERT INTO residences (user_id, ${RESIDENCE_COLS})
      VALUES ($1, ${RESIDENCE_PARAMS}) RETURNING id
    `, [
      targetUserId,
      ...extractResidenceData(data, {
        evacuationStatus: data.evacuationStatus || 'unknown',
        agentNotes: data.agentNotes || '',
        shelterName: data.shelterName || '',
      })
    ])

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'CREATE', entityType: 'residence', entityId: agResult.lastID,
      newValues: { address: data.address, neighborhood: data.neighborhood, registered_by: 'agent', targetUserId },
      ipAddress: req.ip,
    })

    res.status(201).json({ message: 'Residência cadastrada pelo agente', userId: targetUserId })
  } catch (error) {
    logError('Agent register error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar residência' })
  }
})

router.post('/:id/photo', authenticateToken, requireAgent, async (req, res) => {
  try {
    const { photo } = req.body
    if (!photo || typeof photo !== 'string' || !photo.startsWith('data:image/')) {
      return res.status(400).json({ error: 'Foto inválida' })
    }
    if (photo.length > 2 * 1024 * 1024) return res.status(400).json({ error: 'Foto muito grande. Máximo 2MB.' })
    const residence = await runGet(db, 'SELECT id, prescription_photos FROM residences WHERE id = $1', [req.params.id])
    if (!residence) return res.status(404).json({ error: 'Residência não encontrada' })
    const photos = JSON.parse(residence.prescription_photos || '[]')
    if (photos.length >= 5) return res.status(400).json({ error: 'Máximo de 5 fotos' })
    photos.push(photo)
    await runRun(db, 'UPDATE residences SET prescription_photos = $1 WHERE id = $2', [JSON.stringify(photos), residence.id])
    res.json({ photos })
  } catch (error) {
    logError('Agent upload photo error:', error)
    res.status(500).json({ error: 'Erro ao salvar foto' })
  }
})

router.delete('/:id/photo/:index', authenticateToken, requireAgent, async (req, res) => {
  try {
    const residence = await runGet(db, 'SELECT id, prescription_photos FROM residences WHERE id = $1', [req.params.id])
    if (!residence) return res.status(404).json({ error: 'Residência não encontrada' })
    const idx = parseInt(req.params.index)
    const photos = JSON.parse(residence.prescription_photos || '[]')
    if (idx < 0 || idx >= photos.length) return res.status(400).json({ error: 'Índice inválido' })
    photos.splice(idx, 1)
    await runRun(db, 'UPDATE residences SET prescription_photos = $1 WHERE id = $2', [JSON.stringify(photos), residence.id])
    res.json({ photos })
  } catch (error) {
    logError('Agent delete photo error:', error)
    res.status(500).json({ error: 'Erro ao remover foto' })
  }
})

router.get('/export/csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const residences = await runQuery(db, `
      SELECT r.*, u.name AS resident_name, u.email AS resident_email
      FROM residences r JOIN users u ON r.user_id = u.id
      ORDER BY r.neighborhood, r.address
    `)
    const cabecalho = 'id,endereco,numero,bairro,residentes,nome_responsavel,email,telefone,latitude,longitude,nivel_alagamento,nivel_evacuacao,status_evacuacao,idosos,criancas,gestantes,pcd,comorbidades,veiculo,animais_grande_porte,acesso_superior,energia,plano_abrigo,logistica_evacuacao,observacoes,data_cadastro'
    const linhas = residences.map(r => [
      r.id, `"${(r.address || '').replace(/"/g, '""')}"`, r.house_number || '', `"${r.neighborhood}"`, r.residents,
      `"${r.resident_name || ''}"`, r.resident_email || '', r.telefone_contato || '',
      r.latitude, r.longitude, r.flood_level, r.evacuation_level, r.evacuation_status,
      r.has_elderly ? 1 : 0, r.has_children ? 1 : 0, r.has_pregnant ? 1 : 0, r.has_disabled ? 1 : 0,
      `"${(r.comorbidades || '').replace(/"/g, '""')}"`,
      r.possui_veiculo ? 1 : 0, r.possui_animais_grande_porte ? 1 : 0, r.acesso_superior ? 1 : 0, r.necessita_energia ? 1 : 0,
      `"${r.shelter_plan || ''}"`, r.evacuation_logistics || '', `"${(r.agent_notes || '').replace(/"/g, '""')}"`,
      r.created_at ? new Date(r.created_at).toISOString().split('T')[0] : ''
    ].join(','))
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=residencias.csv')
    res.write('\uFEFF')
    res.write(cabecalho + '\n')
    res.write(linhas.join('\n'))
    res.end()
  } catch (error) {
    logError('Export CSV error:', error)
    res.status(500).json({ error: 'Erro ao exportar CSV' })
  }
})

router.get('/locations', authenticateToken, async (req, res) => {
  try {
    const locations = await runQuery(db, `
      SELECT r.latitude, r.longitude, r.flood_level, r.evacuation_status
      FROM residences r
      WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
        AND r.latitude != 0 AND r.longitude != 0
      ORDER BY r.flood_level ASC
    `)
    if (!Array.isArray(locations)) return res.json([])
    res.json(locations.map(r => ({
      latitude: parseFloat(r.latitude),
      longitude: parseFloat(r.longitude),
      flood_level: r.flood_level,
      evacuation_status: r.evacuation_status,
    })))
  } catch (error) {
    logError('Residence locations error:', error)
    res.status(500).json({ error: 'Erro ao carregar localizações' })
  }
})

// Residências sem lat/long — sobra de ruas que o import não conseguiu
// geocodificar automaticamente contra ruas.geojson (ver streetGeocoder.js).
router.get('/missing-location', authenticateToken, requireAgent, async (req, res) => {
  try {
    const rows = await runQuery(db, `
      SELECT id, house_number, address, neighborhood, flood_level
      FROM residences
      WHERE (latitude IS NULL OR longitude IS NULL)
      ORDER BY neighborhood, address
    `)
    res.json(rows)
  } catch (error) {
    logError('Missing location error:', error)
    res.status(500).json({ error: 'Erro ao buscar residências sem localização' })
  }
})

// Ajuste manual do pino de uma residência (LocationPicker no frontend) —
// recalcula flood_level/evacuation_level pro ponto informado.
router.patch('/:id/location', authenticateToken, requireAgent, async (req, res) => {
  try {
    const { latitude, longitude } = req.body
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ error: 'latitude e longitude são obrigatórios' })
    }
    const affectedAt = findAffectedLevel(latitude, longitude)
    const floodLevel = affectedAt ?? 10
    const evacuationLevel = affectedAt != null ? Math.max(0, parseFloat((affectedAt - 1).toFixed(2))) : null

    const result = await runRun(db, `
      UPDATE residences SET latitude = $1, longitude = $2, flood_level = $3, evacuation_level = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [latitude, longitude, floodLevel, evacuationLevel, req.params.id])
    if (result.changes === 0) return res.status(404).json({ error: 'Residência não encontrada' })

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'UPDATE', entityType: 'residence', entityId: parseInt(req.params.id),
      newValues: { latitude, longitude, flood_level: floodLevel, evacuation_level: evacuationLevel },
      ipAddress: req.ip,
    })
    res.json({ floodLevel, evacuationLevel })
  } catch (error) {
    logError('Residence location update error:', error)
    res.status(500).json({ error: 'Erro ao atualizar localização' })
  }
})

/**
 * Botão "geocodificar automaticamente": tenta o Nominatim (OpenStreetMap)
 * pra cada residência sem lat/long, sequencial e com pausa de >1s entre
 * chamadas (política de uso do Nominatim). Sob demanda de um agente — não
 * roda em background/cron.
 */
router.post('/geocode-missing', authenticateToken, requireAgent, async (req, res) => {
  try {
    const pending = await runQuery(db, `
      SELECT id, house_number, address, neighborhood FROM residences
      WHERE (latitude IS NULL OR longitude IS NULL)
    `)
    if (pending.length === 0) {
      return res.json({ total: 0, fixed: 0, stillMissing: [] })
    }

    const items = pending.map(r => ({
      id: r.id,
      query: `${r.address}, ${r.neighborhood}, São Jerônimo, RS, Brasil`,
    }))
    const results = await geocodeBatch(items)

    let fixed = 0
    const stillMissing = []
    for (const { id, geo } of results) {
      if (!geo) {
        const row = pending.find(r => r.id === id)
        stillMissing.push({ id, address: row?.address, neighborhood: row?.neighborhood })
        continue
      }
      const affectedAt = findAffectedLevel(geo.lat, geo.lng)
      const floodLevel = affectedAt ?? 10
      const evacuationLevel = affectedAt != null ? Math.max(0, parseFloat((affectedAt - 1).toFixed(2))) : null
      await runRun(db, `
        UPDATE residences SET latitude = $1, longitude = $2, flood_level = $3, evacuation_level = $4, updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `, [geo.lat, geo.lng, floodLevel, evacuationLevel, id])
      fixed++
    }

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: req.user.profile,
      action: 'UPDATE', entityType: 'residence', entityId: null,
      newValues: { action: 'geocode-missing', total: pending.length, fixed, stillMissing: stillMissing.length },
      ipAddress: req.ip,
    })

    res.json({ total: pending.length, fixed, stillMissing })
  } catch (error) {
    logError('Geocode missing error:', error)
    res.status(500).json({ error: 'Erro ao geocodificar residências pendentes' })
  }
})

export default router
