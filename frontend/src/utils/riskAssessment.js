import * as turf from '@turf/turf'

const FLOOD_BASE_PATH = '/inundacao'

const floodCache = {}

function getLevelPath(level) {
  const adjusted = (Math.round(level * 5) / 5).toFixed(1)
  const levelStr = adjusted.endsWith('.0') ? adjusted.slice(0, -2) : adjusted
  return `${FLOOD_BASE_PATH}/flood_${levelStr}m_clean.geojson`
}

async function getFloodData(level) {
  const filePath = getLevelPath(level)
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

async function getFloodDataBatch(levels) {
  return Promise.all(levels.map(getFloodData))
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

  if (currentRiverLevel != null) {
    const centerLevel = Math.round(currentRiverLevel * 5) / 5
    const nearLevels = []
    for (let l = Math.max(1, centerLevel - 2); l <= Math.min(15, centerLevel + 3); l = Math.round((l + 0.2) * 5) / 5) {
      nearLevels.push(parseFloat(l.toFixed(1)))
    }
    const nearData = await getFloodDataBatch(nearLevels)
    for (let i = 0; i < nearLevels.length; i++) {
      if (nearData[i] && pointInFloodZone(point, nearData[i])) {
        const isCurrentlyAffected = currentRiverLevel >= nearLevels[i]
        let riskLevel = 'low'
        if (nearLevels[i] <= 4) riskLevel = 'high'
        else if (nearLevels[i] <= 7) riskLevel = 'medium'
        return { riskLevel, affectedAt: nearLevels[i], isCurrentlyAffected, currentRiverLevel }
      }
    }
  }

  const allLevels = []
  for (let i = 1; i <= 15; i = Math.round((i + 0.2) * 5) / 5) {
    allLevels.push(parseFloat(i.toFixed(1)))
  }
  const allData = await getFloodDataBatch(allLevels)
  let minAffectedLevel = null
  for (let i = 0; i < allLevels.length; i++) {
    if (allData[i] && pointInFloodZone(point, allData[i])) {
      minAffectedLevel = allLevels[i]
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
