import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { createLogger } from '../utils/logger.js'
import db from '../database/db.js'
import { runQuery } from '../database/helpers.js'
import { authenticateToken, requireProfile } from '../middleware/auth.js'
import { logAudit } from '../database/audit.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const router = Router()
const { log: logError } = createLogger('server-error.log')
const DATA_DIR = path.join(__dirname, '../../data/inundacao')
const MAX_FLOOD_LEVEL = parseInt(process.env.MAX_FLOOD_LEVEL) || 15

const FLOOD_FIELDS = {
  ADMIN: ['id','address','house_number','neighborhood','residents','has_elderly','has_children','has_pregnant','has_disabled','comorbidities','telefone_contato','telefone_emergencia','possui_veiculo','evacuation_logistics','shelter_plan','pets','user_name','user_phone','user_email','evacuation_status','flood_level','health_markers','medicamentos_continuos','household_members','emergency_contact_name','emergency_contact_phone','needs_evacuation_help','evacuation_reason','needs_truck','pets_info','shelter_destination'],
  DEFESA_CIVIL: ['id','address','house_number','neighborhood','residents','has_elderly','has_children','has_pregnant','has_disabled','telefone_contato','telefone_emergencia','possui_veiculo','evacuation_logistics','shelter_plan','pets','user_name','user_phone','evacuation_status','flood_level','needs_evacuation_help','evacuation_reason','needs_truck','shelter_destination'],
  SAUDE: ['id','address','house_number','neighborhood','residents','has_elderly','has_children','has_pregnant','has_disabled','comorbidities','user_name','evacuation_status','flood_level','health_markers','medicamentos_continuos'],
  ASSISTENCIA_SOCIAL: ['id','address','house_number','neighborhood','residents','has_elderly','has_children','has_pregnant','has_disabled','telefone_contato','evacuation_logistics','shelter_plan','user_name','evacuation_status','flood_level','needs_evacuation_help','evacuation_reason','needs_truck','shelter_destination','pets_info'],
}

function filterFields(row, profile) {
  const allowed = FLOOD_FIELDS[profile] || FLOOD_FIELDS.DEFESA_CIVIL
  const filtered = {}
  for (const key of allowed) {
    if (key in row) filtered[key] = row[key]
  }
  return filtered
}

function levelToFilename(level) {
  const s = level % 1 === 0 ? `${level}m` : `${level.toFixed(1)}m`
  return `flood_${s}_clean.geojson`
}

function getFloodGeoJSON(level) {
  for (let attempt = level; attempt >= 1; attempt -= 0.2) {
    const rounded = Math.round(attempt * 5) / 5
    const filename = levelToFilename(rounded)
    const filepath = path.join(DATA_DIR, filename)
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'))
    }
  }
  return null
}

function pointInRing(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInPolygon(point, coords) {
  if (!coords || coords.length === 0) return false
  const exterior = coords[0]
  if (!pointInRing(point, exterior)) return false
  for (let i = 1; i < coords.length; i++) {
    if (pointInRing(point, coords[i])) return false
  }
  return true
}

function isPointInFloodZone(lng, lat, geojson) {
  const point = [lng, lat]
  for (const feature of geojson.features) {
    const geom = feature.geometry
    if (!geom) continue
    if (geom.type === 'Polygon') {
      if (pointInPolygon(point, geom.coordinates)) return true
    } else if (geom.type === 'MultiPolygon') {
      for (const polygon of geom.coordinates) {
        if (pointInPolygon(point, polygon)) return true
      }
    }
  }
  return false
}

router.get('/geojson/:level', async (req, res) => {
  try {
    const level = parseFloat(req.params.level)
    if (isNaN(level) || level < 1 || level > MAX_FLOOD_LEVEL) {
      return res.status(400).json({ error: `Nível inválido (1-${MAX_FLOOD_LEVEL})` })
    }
    const data = getFloodGeoJSON(level)
    if (!data) return res.status(404).json({ error: 'Nenhum GeoJSON encontrado' })
    res.json(data)
  } catch (error) {
    logError('Flood GeoJSON error:', error)
    res.status(500).json({ error: 'Erro ao carregar dados de inundação' })
  }
})

router.get('/impact/:level', authenticateToken, requireProfile(['ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL']), async (req, res) => {
  try {
    const level = parseFloat(req.params.level)
    if (isNaN(level) || level < 1 || level > MAX_FLOOD_LEVEL) {
      return res.status(400).json({ error: `Nível inválido (1-${MAX_FLOOD_LEVEL})` })
    }

    const profile = req.user.profile === 'ADMIN' ? 'ADMIN' :
      req.user.profile === 'SAUDE' ? 'SAUDE' :
      req.user.profile === 'ASSISTENCIA_SOCIAL' ? 'ASSISTENCIA_SOCIAL' :
      'DEFESA_CIVIL'

    const rows = await runQuery(db, `
      SELECT r.*, u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM residences r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
    `, [])

    const geojson = getFloodGeoJSON(level)
    const affected = []
    const streetSet = new Set()

    if (geojson) {
      for (const row of rows) {
        if (isPointInFloodZone(row.longitude, row.latitude, geojson)) {
          affected.push(row)
          if (row.address) streetSet.add(`${row.neighborhood || ''}::${row.address}`)
        }
      }
    } else {
      for (const row of rows) {
        if (row.flood_level != null && row.flood_level <= level) {
          affected.push(row)
          if (row.address) streetSet.add(`${row.neighborhood || ''}::${row.address}`)
        }
      }
    }

    const neighborhoods = {}
    for (const r of affected) {
      const bairro = r.neighborhood || 'Sem bairro'
      if (!neighborhoods[bairro]) {
        neighborhoods[bairro] = { affectedStreets: [], totalResidences: 0, totalResidents: 0, residences: [] }
      }
      const nb = neighborhoods[bairro]
      nb.totalResidences++
      nb.totalResidents += r.residents || 0
      nb.residences.push(filterFields(r, profile))
    }

    for (const bairro of Object.keys(neighborhoods)) {
      const streetNames = [...new Set(neighborhoods[bairro].residences.map(r => r.address).filter(Boolean))]
      neighborhoods[bairro].affectedStreets = streetNames.sort()
    }

    await logAudit(db, {
      userId: req.user.userId, userName: req.user.name, userProfile: profile,
      action: 'VIEW', entityType: 'flood_impact', entityId: null,
      newValues: { level, totalAffected: affected.length, totalResidents: affected.reduce((sum, r) => sum + (r.residents || 0), 0), totalStreets: streetSet.size },
      ipAddress: req.ip,
    })

    res.json({
      level,
      totalAffected: affected.length,
      totalResidents: affected.reduce((sum, r) => sum + (r.residents || 0), 0),
      totalStreets: streetSet.size,
      neighborhoods,
    })
  } catch (error) {
    logError('Flood impact error:', error)
    res.status(500).json({ error: 'Erro ao calcular impacto' })
  }
})

export default router
