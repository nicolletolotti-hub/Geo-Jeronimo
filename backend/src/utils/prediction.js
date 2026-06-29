const TRAVEL_TIME_HOURS = {
  donaFrancisca: { to: 'São Jerônimo', hours: 28, min: 24, max: 30 },
  cachoeiraDoSul: { to: 'São Jerônimo', hours: 18, min: 14, max: 22 },
  taquari: { to: 'São Jerônimo', hours: 22, min: 18, max: 28 },
}

const RAINFALL_THRESHOLD_MM = 150

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

/**
 * Calcula tendência baseada em chuva acumulada nas estações a montante.
 * Usa dados de chuva das últimas 24h e 168h (7 dias).
 */
export function predictTrendFromRainfall(upstreamData) {
  if (!upstreamData) return null

  let totalRainfall24h = 0
  let totalRainfall168h = 0
  let rainfallSources = []

  for (const [key, station] of Object.entries(upstreamData)) {
    if (!station || !station.rainfall) continue

    const h24 = station.rainfall.h24 || 0
    const h168 = station.rainfall.h168 || 0

    totalRainfall24h += h24
    totalRainfall168h += h168

    if (h24 > 0) {
      rainfallSources.push({
        station: station.station,
        h24,
        h168,
      })
    }
  }

  let trend = 'stable'
  let confidence = 'low'
  let reason = ''

  if (totalRainfall24h >= RAINFALL_THRESHOLD_MM) {
    trend = 'rising'
    confidence = 'high'
    reason = `Chuva intensa nas últimas 24h (${totalRainfall24h.toFixed(0)}mm). Tendência de subida.`
  } else if (totalRainfall24h >= 50) {
    trend = 'rising'
    confidence = 'medium'
    reason = `Chuva moderada nas últimas 24h (${totalRainfall24h.toFixed(0)}mm). Possível subida.`
  } else if (totalRainfall24h >= 10) {
    trend = 'stable'
    confidence = 'medium'
    reason = `Chuva leve nas últimas 24h (${totalRainfall24h.toFixed(0)}mm). Tendência estável.`
  } else {
    trend = 'falling'
    confidence = 'medium'
    reason = `Pouca chuva nas últimas 24h (${totalRainfall24h.toFixed(0)}mm). Tendência de descida/estável.`
  }

  if (rainfallSources.length === 0) {
    confidence = 'low'
    reason = 'Dados de chuva indisponíveis. Tendência incerta.'
  }

  return {
    trend,
    confidence,
    totalRainfall24h: parseFloat(totalRainfall24h.toFixed(1)),
    totalRainfall168h: parseFloat(totalRainfall168h.toFixed(1)),
    rainfallSources,
    reason,
    generatedAt: new Date().toISOString(),
  }
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
