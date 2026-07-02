/**
 * floodRisk.js
 *
 * Versão backend de `frontend/src/utils/riskAssessment.js` (função
 * `assessResidenceRisk`, ramo sem `currentRiverLevel`). O frontend usa
 * `fetch()` contra arquivos estáticos servidos pelo Vite/Vercel; aqui não
 * há navegador, então os mesmos GeoJSON são lidos do disco (copiados de
 * `frontend/public/inundacao/` para `backend/src/data/inundacao/` porque
 * o build do Railway só enxerga a pasta `backend/`, ver railway.toml).
 *
 * Mantém a mesma semântica do frontend:
 *   affectedAt = menor nível do Rio Jacuí (m) que atinge o ponto.
 * Quem chama decide o que fazer com isso (flood_level = affectedAt,
 * evacuation_level = affectedAt - 1, mesmo padrão de ResidenceForm.jsx
 * e ResidencesTab.jsx).
 */
import * as turf from '@turf/turf'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.join(__dirname, '../data/inundacao')
const MAX_FLOOD_LEVEL = 15

const cache = new Map()

function levelToFilename(level) {
  const adjusted = (Math.round(level * 5) / 5).toFixed(1)
  const levelStr = adjusted.endsWith('.0') ? adjusted.slice(0, -2) : adjusted
  return `flood_${levelStr}m_clean.geojson`
}

function loadFloodData(level) {
  const filename = levelToFilename(level)
  if (cache.has(filename)) return cache.get(filename)
  let data = null
  try {
    data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), 'utf8'))
  } catch {
    data = null
  }
  cache.set(filename, data)
  return data
}

function pointInFloodZone(lat, lng, floodGeoJSON) {
  if (!floodGeoJSON?.features?.length) return false
  const pt = turf.point([lng, lat])
  for (const feature of floodGeoJSON.features) {
    try {
      if (turf.booleanPointInPolygon(pt, feature)) return true
    } catch {
      continue
    }
  }
  return false
}

/**
 * @returns {number|null} affectedAt — menor nível (m) que inunda o ponto,
 * ou null se o ponto não é atingido em nenhum nível mapeado (1 a 15m).
 */
export function findAffectedLevel(lat, lng) {
  if (lat == null || lng == null) return null
  for (let level = 1; level <= MAX_FLOOD_LEVEL; level = Math.round((level + 0.2) * 5) / 5) {
    const data = loadFloodData(level)
    if (data && pointInFloodZone(lat, lng, data)) {
      return parseFloat(level.toFixed(1))
    }
  }
  return null
}
