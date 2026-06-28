import * as turf from '@turf/turf'
import { MAX_FLOOD_LEVEL } from '../constants/maxFloodLevel'
import { getFloodCache, setFloodCache } from './floodCache'

const FLOOD_BASE_PATH = '/inundacao'

function getLevelPath(level) {
  const adjusted = (Math.round(level * 5) / 5).toFixed(1)
  const levelStr = adjusted.endsWith('.0') ? adjusted.slice(0, -2) : adjusted
  return `${FLOOD_BASE_PATH}/flood_${levelStr}m_clean.geojson`
}

async function getFloodData(level) {
  const filePath = getLevelPath(level)
  const cached = getFloodCache(filePath)
  if (cached) return cached
  try {
    const response = await fetch(filePath)
    if (!response.ok) return null
    const data = await response.json()
    setFloodCache(filePath, data)
    return data
  } catch {
    return null
  }
}

async function getFloodDataBatch(levels, concurrency = 6) {
  const results = []
  for (let i = 0; i < levels.length; i += concurrency) {
    const chunk = levels.slice(i, i + concurrency)
    const chunkResults = await Promise.all(chunk.map(getFloodData))
    results.push(...chunkResults)
  }
  return results
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
    for (let l = Math.max(1, centerLevel - 2); l <= Math.min(MAX_FLOOD_LEVEL, centerLevel + 3); l = Math.round((l + 0.2) * 5) / 5) {
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
  for (let i = 1; i <= MAX_FLOOD_LEVEL; i = Math.round((i + 0.2) * 5) / 5) {
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

export function countFloodedStreetsInNeighborhood(neighborhoodFeature, floodGeoJSON, ruasGeoJSON) {
  if (!neighborhoodFeature || !ruasGeoJSON?.features?.length) {
    return { flooded: [], total: 0 }
  }

  const poly = turf.polygon(neighborhoodFeature.geometry.coordinates)
  const flooded = new Set()
  const inNeighborhood = new Set()

  for (const f of ruasGeoJSON.features) {
    const name = f.properties?.name
    if (!name) continue
    try {
      const street = f.geometry.type === 'LineString'
        ? turf.lineString(f.geometry.coordinates)
        : turf.multiLineString(f.geometry.coordinates)
      if (!turf.booleanIntersects(street, poly)) continue
      inNeighborhood.add(name)

      if (floodGeoJSON?.features?.length) {
        for (const floodFeature of floodGeoJSON.features) {
          try {
            if (turf.booleanIntersects(street, floodFeature)) {
              flooded.add(name)
              break
            }
          } catch {
            continue
          }
        }
      }
    } catch {
      continue
    }
  }

  return { flooded: [...flooded].sort(), total: inNeighborhood.size }
}

export function assessNeighborhoodAlert(floodedCount, totalStreets) {
  if (floodedCount === 0) return 'NORMAL'
  const ratio = totalStreets > 0 ? floodedCount / totalStreets : 1
  if (ratio >= 0.5 || floodedCount >= 15) return 'CRÍTICO'
  if (ratio >= 0.3 || floodedCount >= 10) return 'ALERTA'
  if (ratio >= 0.1 || floodedCount >= 3) return 'ATENÇÃO'
  return 'NORMAL'
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
