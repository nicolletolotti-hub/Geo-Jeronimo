import * as turf from '@turf/turf'

const FLOOD_BASE_PATH = '/inundacao'

const floodLevels = []
for (let i = 1; i <= 15; i += 0.2) {
  const rounded = Math.round(i * 5) / 5
  const levelStr = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1)
  floodLevels.push(parseFloat(levelStr))
}

const floodCache = {}

async function getFloodData(level) {
  const adjustedLevel = (Math.round(level * 5) / 5).toFixed(1)
  const levelString = adjustedLevel.endsWith('.0') ? adjustedLevel.slice(0, -2) : adjustedLevel
  const filePath = `${FLOOD_BASE_PATH}/flood_${levelString}m_clean.geojson`

  if (floodCache[filePath]) return floodCache[filePath]

  try {
    const response = await fetch(filePath)
    if (!response.ok) return null
    const data = await response.json()
    floodCache[filePath] = data
    return data
  } catch {
    return null
  }
}

function pointInFloodZone(point, floodGeoJSON) {
  if (!floodGeoJSON?.features?.length) return false
  const pt = turf.point([point.lng, point.lat])
  for (const feature of floodGeoJSON.features) {
    try {
      if (turf.booleanPointInPolygon(pt, feature)) return true
    } catch {
      continue
    }
  }
  return false
}

export async function assessResidenceRisk(lat, lng, currentRiverLevel) {
  if (!lat || !lng) return { riskLevel: 'unknown', affectedAt: null, isCurrentlyAffected: false }

  const point = { lat, lng }

  let minAffectedLevel = null
  for (const level of floodLevels) {
    const data = await getFloodData(level)
    if (data && pointInFloodZone(point, data)) {
      minAffectedLevel = level
      break
    }
  }

  const isCurrentlyAffected = currentRiverLevel !== null && currentRiverLevel !== undefined
    && minAffectedLevel !== null
    && currentRiverLevel >= minAffectedLevel

  let riskLevel = 'low'
  if (minAffectedLevel === null) {
    riskLevel = 'very_low'
  } else if (minAffectedLevel <= 4) {
    riskLevel = 'high'
  } else if (minAffectedLevel <= 7) {
    riskLevel = 'medium'
  } else {
    riskLevel = 'low'
  }

  return {
    riskLevel,
    affectedAt: minAffectedLevel,
    isCurrentlyAffected,
    currentRiverLevel,
  }
}

export function getRiskConfig(riskLevel) {
  switch (riskLevel) {
    case 'very_low':
      return {
        label: 'Muito Baixo',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        icon: '🟢',
        description: 'Sua residência não está em área de inundação',
      }
    case 'low':
      return {
        label: 'Baixo',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        icon: '🟢',
        description: 'Sua residência pode ser afetada apenas em enchentes severas',
      }
    case 'medium':
      return {
        label: 'Médio',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        icon: '🟡',
        description: 'Sua residência está em área de risco moderado',
      }
    case 'high':
      return {
        label: 'Alto',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        icon: '🔴',
        description: 'Sua residência está em área de alto risco de inundação',
      }
    default:
      return {
        label: 'Desconhecido',
        color: 'text-slate-400',
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        icon: '⚪',
        description: 'Posicione sua residência no mapa para avaliação',
      }
  }
}
