const TRAVEL_TIME_HOURS = {
  donaFrancisca: { to: 'São Jerônimo', hours: 28, min: 24, max: 30 },
  cachoeiraDoSul: { to: 'São Jerônimo', hours: 18, min: 14, max: 22 },
  taquari: { to: 'São Jerônimo', hours: 22, min: 18, max: 28 },
}

/**
 * Normaliza taxa de variação para metros/hora.
 * Defesa Civil RS retorna m/h; scraper Nível Guaíba retorna cm/h (valores tipicamente > 1).
 */
function trendRateToMetersPerHour(station) {
  const rate = Math.abs(station.trendRate || 0)
  if (rate === 0) return 0
  const source = (station.source || '').toLowerCase()
  if (source.includes('defesa civil') || source.includes('graphql')) return rate
  if (rate > 1) return rate / 100
  return rate
}

function resolveBaseLevel(currentLocalLevel, stationLevel) {
  if (currentLocalLevel != null) return currentLocalLevel
  if (stationLevel != null) return stationLevel
  return 0
}

export function predictLevelForSaoJeronimo(upstreamData, currentLocalLevel) {
  if (!upstreamData) return null

  const predictions = []
  let highestRisk = 'normal'
  let highestPredictedLevel = currentLocalLevel != null ? currentLocalLevel : 0

  for (const [key, station] of Object.entries(upstreamData)) {
    if (!station || station.level === null) continue

    const travel = TRAVEL_TIME_HOURS[key]
    if (!travel) continue

    const trend = station.trend === 'rising' ? 1 : station.trend === 'falling' ? -1 : 0
    const trendRateMh = trendRateToMetersPerHour(station)
    const predictedChange = trend * trendRateMh * travel.hours
    const baseLevel = resolveBaseLevel(currentLocalLevel, station.level)
    const predictedLocalLevel = baseLevel + predictedChange

    const changeDesc = predictedChange > 0 ? 'subindo' : predictedChange < 0 ? 'descendo' : 'estável'

    predictions.push({
      from: station.station,
      currentLevel: station.level,
      trend: station.trend,
      trendRate: station.trendRate,
      travelTimeHours: travel.hours,
      travelTimeMin: travel.min,
      travelTimeMax: travel.max,
      predictedChange: parseFloat(predictedChange.toFixed(2)),
      predictedLocalLevel: parseFloat(Math.max(0.1, predictedLocalLevel).toFixed(2)),
      arrivalWindow: `${travel.min}-${travel.max}h`,
      reason: `${station.station} ${changeDesc}`,
    })

    if (predictedLocalLevel > highestPredictedLevel) {
      highestPredictedLevel = predictedLocalLevel
    }
  }

  if (highestPredictedLevel >= 7) highestRisk = 'danger'
  else if (highestPredictedLevel >= 5) highestRisk = 'warning'

  return {
    predictions,
    overallRisk: highestRisk,
    highestPredictedLevel: parseFloat(highestPredictedLevel.toFixed(2)),
    generatedAt: new Date().toISOString(),
    note: 'Previsão baseada na taxa de variação (m/h) e tempo de propagação estimado da onda de cheia entre estações a montante e São Jerônimo.',
  }
}

export default {
  predictLevelForSaoJeronimo,
}
