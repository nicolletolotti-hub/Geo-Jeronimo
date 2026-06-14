import express from 'express'
import multer from 'multer'
import XLSX from 'xlsx'
import fs from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import db from '../database/db.js'
import { runQuery, runGet, runRun } from '../database/helpers.js'
import { authenticateToken, requireAdmin } from '../middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const upload = multer({
  dest: path.join(__dirname, '../../uploads/'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (['.xlsx', '.xls', '.csv'].includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Formato inválido. Use .xlsx, .xls ou .csv'))
    }
  }
})

const router = express.Router()

function normalizeHeader(h) {
  if (!h) return ''
  const map = {
    'endereco': 'address', 'endereço': 'address', 'logradouro': 'address', 'rua': 'address',
    'bairro': 'neighborhood',
    'moradores': 'residents', 'residentes': 'residents', 'pessoas': 'residents', 'num_moradores': 'residents',
    'nome': 'name', 'nome_completo': 'name', 'morador': 'name',
    'email': 'email', 'e-mail': 'email',
    'telefone': 'phone', 'celular': 'phone', 'whatsapp': 'phone', 'contato': 'phone', 'tel': 'phone',
    'comorbidades': 'comorbidities',
    'idoso': 'has_elderly', 'idosos': 'has_elderly', 'possui_idoso': 'has_elderly',
    'crianca': 'has_children', 'criancas': 'has_children', 'criança': 'has_children', 'crianças': 'has_children', 'possui_crianca': 'has_children',
    'gestante': 'has_pregnant', 'gestantes': 'has_pregnant', 'gravida': 'has_pregnant', 'grávida': 'has_pregnant',
    'deficiente': 'has_disabled', 'deficientes': 'has_disabled', 'pcd': 'has_disabled', 'possui_deficiente': 'has_disabled',
    'pets': 'pets', 'animais': 'pets', 'animais_estimacao': 'pets',
    'logistica': 'evacuation_logistics', 'logistica_evacuacao': 'evacuation_logistics', 'transporte': 'evacuation_logistics',
    'abrigo': 'shelter_plan', 'plano_abrigo': 'shelter_plan', 'para_onde': 'shelter_plan',
    'auxilio': 'preventive_aid', 'auxilio_preventivo': 'preventive_aid', 'preventive_aid': 'preventive_aid',
    'nivel_enchente': 'flood_level', 'nivel_inundacao': 'flood_level', 'flood_level': 'flood_level',
    'nivel_evacuacao': 'evacuation_level', 'evacuation_level': 'evacuation_level',
    'latitude': 'latitude', 'lat': 'latitude',
    'longitude': 'longitude', 'long': 'longitude', 'lng': 'longitude',
    'obs': 'agent_notes', 'observacao': 'agent_notes', 'observações': 'agent_notes', 'observacoes': 'agent_notes',
    'status': 'evacuation_status', 'status_evacuacao': 'evacuation_status',
    'veiculo': 'possui_veiculo', 'possui_veiculo': 'possui_veiculo', 'carro': 'possui_veiculo',
    'medicamentos': 'medicamentos_continuos', 'remedios': 'medicamentos_continuos', 'remédios': 'medicamentos_continuos',
    'energia': 'necessita_energia', 'depende_energia': 'necessita_energia', 'aparelhos': 'necessita_energia',
    'referencia': 'pontos_referencia', 'ponto_referencia': 'pontos_referencia', 'pontos_referencia': 'pontos_referencia',
    'abrigo_preferido': 'abrigo_preferencial', 'abrigo_preferencial': 'abrigo_preferencial',
  }
  const cleaned = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
  return map[cleaned] || map[h.toLowerCase().trim()] || cleaned
}

function parseValue(field, value) {
  if (value === undefined || value === null || value === '') return undefined
  if (['has_elderly', 'has_children', 'has_pregnant', 'has_disabled', 'possui_veiculo', 'possui_animais_grande_porte', 'acesso_superior', 'necessita_energia'].includes(field)) {
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const v = value.toLowerCase().trim()
      return v === 'sim' || v === 's' || v === 'true' || v === '1' || v === 'yes'
    }
    if (typeof value === 'number') return value === 1
    return false
  }
  if (['residents'].includes(field)) {
    const n = parseInt(value)
    return isNaN(n) ? 0 : n
  }
  if (['flood_level', 'evacuation_level', 'latitude', 'longitude'].includes(field)) {
    const n = parseFloat(value)
    return isNaN(n) ? null : n
  }
  return String(value).trim()
}

router.post('/excel', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' })
    }

    const workbook = XLSX.readFile(req.file.path)
    const sheetName = workbook.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })

    if (!data.length) {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ error: 'Planilha vazia' })
    }

    const headers = Object.keys(data[0])
    const mappedHeaders = {}
    headers.forEach(h => { mappedHeaders[h] = normalizeHeader(h) })

    let imported = 0
    let skipped = 0
    const errors = []

    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      const mapped = {}
      Object.keys(row).forEach(k => {
        const field = mappedHeaders[k]
        if (field) mapped[field] = parseValue(field, row[k])
      })

      if (!mapped.address) {
        skipped++
        errors.push(`Linha ${i + 2}: endereço não informado`)
        continue
      }
      if (!mapped.neighborhood) {
        skipped++
        errors.push(`Linha ${i + 2}: bairro não informado`)
        continue
      }

      try {
        const email = mapped.email || `importado_${Date.now()}_${i}@geojeronimo.app`
        const name = mapped.name || `Morador ${mapped.address}`

        let user = await runGet(db, 'SELECT id FROM users WHERE email = $1', [email])
        if (!user) {
          const tempPassword = await bcrypt.hash('cidadao123', 10)
          const result = await runRun(db,
            'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
            [email, tempPassword, name, 'user']
          )
          user = { id: result.lastID }
        }

        const existing = await runGet(db, 'SELECT id FROM residences WHERE user_id = $1', [user.id])
        if (existing) {
          skipped++
          errors.push(`Linha ${i + 2}: usuário ${email} já possui residência cadastrada`)
          continue
        }

        await runRun(db, `
          INSERT INTO residences (
            user_id, address, neighborhood, residents, comorbidities,
            has_elderly, has_children, has_pregnant, has_disabled,
            telefone_contato, possui_veiculo, medicamentos_continuos,
            necessita_energia, abrigo_preferencial, pontos_referencia,
            pets, evacuation_logistics, shelter_plan, preventive_aid,
            flood_level, evacuation_level, latitude, longitude,
            evacuation_status, agent_notes, registered_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
        `, [
          user.id,
          mapped.address, mapped.neighborhood, mapped.residents || 0, mapped.comorbidities || '',
          mapped.has_elderly ? 1 : 0, mapped.has_children ? 1 : 0, mapped.has_pregnant ? 1 : 0, mapped.has_disabled ? 1 : 0,
          mapped.phone || mapped.telefoneContato || '', mapped.possuiVeiculo ? 1 : 0, mapped.medicamentosContinuos || '',
          mapped.necessitaEnergia ? 1 : 0, mapped.abrigoPreferencial || '', mapped.pontosReferencia || '',
          mapped.pets || '', mapped.evacuationLogistics || 'vehicle', mapped.shelterPlan || 'relatives', mapped.preventiveAid || '',
          mapped.floodLevel || 10, mapped.evacuationLevel || null, mapped.latitude || null, mapped.longitude || null,
          mapped.evacuationStatus || 'unknown', mapped.agentNotes || '', 'import'
        ])
        imported++
      } catch (e) {
        skipped++
        errors.push(`Linha ${i + 2}: ${e.message}`)
      }
    }

    await runRun(db, `
      INSERT INTO import_log (filename, total_rows, imported_rows, skipped_rows, status, error, imported_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [req.file.originalname, data.length, imported, skipped, errors.length > imported ? 'partial' : 'completed', errors.slice(0, 50).join('; '), req.user.userId])

    fs.unlinkSync(req.file.path)

    res.json({
      message: `Importação concluída: ${imported} registros importados, ${skipped} ignorados`,
      total: data.length,
      imported,
      skipped,
      errors: errors.slice(0, 50)
    })
  } catch (error) {
    logError('Import error:', error)
    if (req.file) try { fs.unlinkSync(req.file.path) } catch {}
    res.status(500).json({ error: 'Erro ao importar planilha' })
  }
})

router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const logs = await runQuery(db, `
      SELECT l.*, u.name as imported_by_name
      FROM import_log l
      JOIN users u ON l.imported_by = u.id
      ORDER BY l.created_at DESC
      LIMIT 20
    `)
    res.json(logs)
  } catch (error) {
    logError('Import logs error:', error)
    res.status(500).json({ error: 'Erro ao buscar logs' })
  }
})

function logError(...args) {
  try {
    const logFile = path.join(__dirname, '../../../server-error.log')
    const line = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? (a.stack || a.message || JSON.stringify(a)) : a).join(' ')}\n`
    fs.appendFileSync(logFile, line)
  } catch {}
  console.error(...args)
}

export default router
