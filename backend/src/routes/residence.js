import express from 'express'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin, requireAgent } from '../middleware/auth.js'
import { ResidenceSchema, AgentResidenceSchema, EvacuationStatusSchema, ImportRowSchema, validateData } from '../utils/validators.js'

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
  address, neighborhood, residents, comorbidities,
  has_elderly, has_children, has_pregnant, has_disabled,
  comorbidade_respiratoria, comorbidade_cardiaca, comorbidade_diabetes,
  comorbidade_renal, comorbidade_neurologica, comorbidade_mobilidade,
  comorbidade_saude_mental, comorbidade_alergias, comorbidade_oxigenio, comorbidade_quimioterapia,
  telefone_contato, telefone_emergencia, possui_veiculo,
  possui_animais_grande_porte, acesso_superior, medicamentos_continuos,
  necessita_energia, abrigo_preferencial, pontos_referencia,
  pets, evacuation_logistics, shelter_plan, preventive_aid,
  flood_level, evacuation_level, latitude, longitude,
  evacuation_status, agent_notes, shelter_name
`

const RESIDENCE_PARAMS = `
  $1, $2, $3, $4,
  $5, $6, $7, $8,
  $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
  $19, $20, $21, $22, $23, $24, $25, $26, $27,
  $28, $29, $30, $31,
  $32, $33, $34, $35,
  $36, $37, $38, $39
`

function extractResidenceData(data, extra = {}) {
  return [
    data.address, data.neighborhood, data.residents, data.comorbidities || '',
    data.hasElderly || false, data.hasChildren || false, data.hasPregnant || false, data.hasDisabled || false,
    data.comorbidadeRespiratoria || false, data.comorbidadeCardiaca || false, data.comorbidadeDiabetes || false,
    data.comorbidadeRenal || false, data.comorbidadeNeurologica || false, data.comorbidadeMobilidade || false,
    data.comorbidadeSaudeMental || false, data.comorbidadeAlergias || false, data.comorbidadeOxigenio || false, data.comorbidadeQuimioterapia || false,
    data.telefoneContato || '', data.telefoneEmergencia || '', data.possuiVeiculo || false,
    data.possuiAnimaisGrandePorte || false, data.acessoSuperior || false, data.medicamentosContinuos || '',
    data.necessitaEnergia || false, data.abrigoPreferencial || '', data.pontosReferencia || '',
    data.pets || '', data.evacuationLogistics, data.shelterPlan, data.preventiveAid || '',
    data.floodLevel || 10, data.evacuationLevel || null, data.latitude || null, data.longitude || null,
    extra.evacuationStatus || 'unknown', extra.agentNotes || '', extra.shelterName || '',
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

router.post('/', authenticateToken, async (req, res) => {
  try {
    const validation = validateData(ResidenceSchema, req.body)
    if (!validation.valid) {
      return res.status(400).json({ error: 'Validação falhou', details: validation.errors })
    }

    const data = validation.data
    const existing = await runGet(db, 'SELECT id FROM residences WHERE user_id = $1', [req.user.userId])

    if (existing) {
      await runRun(db, `
        UPDATE residences SET
          address=$1, neighborhood=$2, residents=$3, comorbidities=$4,
          has_elderly=$5, has_children=$6, has_pregnant=$7, has_disabled=$8,
          comorbidade_respiratoria=$9, comorbidade_cardiaca=$10, comorbidade_diabetes=$11,
          comorbidade_renal=$12, comorbidade_neurologica=$13, comorbidade_mobilidade=$14,
          comorbidade_saude_mental=$15, comorbidade_alergias=$16, comorbidade_oxigenio=$17, comorbidade_quimioterapia=$18,
          telefone_contato=$19, telefone_emergencia=$20, possui_veiculo=$21,
          possui_animais_grande_porte=$22, acesso_superior=$23, medicamentos_continuos=$24,
          necessita_energia=$25, abrigo_preferencial=$26, pontos_referencia=$27,
          pets=$28, evacuation_logistics=$29, shelter_plan=$30, preventive_aid=$31,
          flood_level=$32, evacuation_level=$33, latitude=$34, longitude=$35,
          updated_at=CURRENT_TIMESTAMP
        WHERE user_id=$36
      `, [
        data.address, data.neighborhood, data.residents, data.comorbidities || '',
        data.hasElderly || false, data.hasChildren || false, data.hasPregnant || false, data.hasDisabled || false,
        data.comorbidadeRespiratoria || false, data.comorbidadeCardiaca || false, data.comorbidadeDiabetes || false,
        data.comorbidadeRenal || false, data.comorbidadeNeurologica || false, data.comorbidadeMobilidade || false,
        data.comorbidadeSaudeMental || false, data.comorbidadeAlergias || false, data.comorbidadeOxigenio || false, data.comorbidadeQuimioterapia || false,
        data.telefoneContato || '', data.telefoneEmergencia || '', data.possuiVeiculo || false,
        data.possuiAnimaisGrandePorte || false, data.acessoSuperior || false, data.medicamentosContinuos || '',
        data.necessitaEnergia || false, data.abrigoPreferencial || '', data.pontosReferencia || '',
        data.pets || '', data.evacuationLogistics, data.shelterPlan, data.preventiveAid || '',
        data.floodLevel || 10, data.evacuationLevel || null, data.latitude || null, data.longitude || null,
        req.user.userId
      ])
      return res.json({ message: 'Residência atualizada com sucesso' })
    }

    await runRun(db, `
      INSERT INTO residences (user_id, ${RESIDENCE_COLS})
      VALUES ($1, ${RESIDENCE_PARAMS})
    `, [req.user.userId, ...extractResidenceData(data)])

    res.status(201).json({ message: 'Residência cadastrada com sucesso' })
  } catch (error) {
    logError('Save residence error:', error)
    res.status(500).json({ error: 'Erro ao salvar residência' })
  }
})

router.get('/all', authenticateToken, requireAdmin, async (req, res) => {
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
        COUNT(*) FILTER (WHERE evacuation_status = 'not_rescued') as not_rescued,
        COUNT(*) FILTER (WHERE evacuation_status = 'evacuated') as evacuated,
        COUNT(*) FILTER (WHERE evacuation_status = 'in_shelter') as in_shelter,
        COUNT(*) FILTER (WHERE evacuation_status = 'with_family') as with_family,
        COUNT(*) FILTER (WHERE evacuation_status = 'unknown') as unknown_status,
        COUNT(*) FILTER (WHERE has_elderly = true) as has_elderly,
        COUNT(*) FILTER (WHERE has_children = true) as has_children,
        COUNT(*) FILTER (WHERE has_pregnant = true) as has_pregnant,
        COUNT(*) FILTER (WHERE has_disabled = true) as has_disabled,
        COUNT(*) FILTER (WHERE flood_level <= 4) as high_risk,
        COUNT(*) FILTER (WHERE evacuation_logistics = 'boat') as needs_boat
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
        COUNT(*) FILTER (WHERE has_elderly = true OR has_children = true OR has_pregnant = true OR has_disabled = true) as vulneraveis,
        COUNT(*) FILTER (WHERE flood_level <= 4) as alto_risco,
        COUNT(*) FILTER (WHERE evacuation_status = 'not_rescued') as nao_resgatados,
        COUNT(*) FILTER (WHERE evacuation_status = 'evacuated' OR evacuation_status = 'in_shelter' OR evacuation_status = 'with_family') as resgatados,
        COUNT(*) FILTER (WHERE evacuation_status = 'unknown') as desconhecidos,
        COUNT(*) FILTER (WHERE evacuation_logistics = 'boat') as precisa_barco,
        COUNT(*) FILTER (WHERE necessita_energia = true) as depende_energia,
        COUNT(*) FILTER (WHERE possui_animais_grande_porte = true) as animais_grande_porte
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

    res.json(ranked)
  } catch (error) {
    logError('Priority error:', error)
    res.status(500).json({ error: 'Erro ao calcular prioridades' })
  }
})

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const existing = await runGet(db, 'SELECT id FROM residences WHERE id = $1', [id])
    if (!existing) return res.status(404).json({ error: 'Residência não encontrada' })
    await runRun(db, 'DELETE FROM residences WHERE id = $1', [id])
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

    const existing = await runGet(db, 'SELECT id FROM residences WHERE id = $1', [residenceId])
    if (!existing) return res.status(404).json({ error: 'Residência não encontrada' })

    await runRun(db, `
      UPDATE residences SET
        evacuation_status = $1, shelter_name = $2, agent_notes = $3,
        registered_by = 'agent', updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [evacuationStatus, shelterName || '', agentNotes || '', residenceId])

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
      const tempPassword = await bcrypt.hash('cidadao123', 10)

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

    await runRun(db, `
      INSERT INTO residences (user_id, ${RESIDENCE_COLS})
      VALUES ($1, ${RESIDENCE_PARAMS})
    `, [
      targetUserId,
      ...extractResidenceData(data, {
        evacuationStatus: data.evacuationStatus || 'unknown',
        agentNotes: data.agentNotes || '',
        shelterName: data.shelterName || '',
      })
    ])

    res.status(201).json({ message: 'Residência cadastrada pelo agente', userId: targetUserId })
  } catch (error) {
    logError('Agent register error:', error)
    res.status(500).json({ error: 'Erro ao cadastrar residência' })
  }
})

export default router
