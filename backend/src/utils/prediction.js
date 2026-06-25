const TRAVEL_TIME_HOURS = {
  donaFrancisca: { to: 'São Jerônimo', hours: 28, min: 24, max: 30 },
  cachoeiraDoSul: { to: 'São Jerônimo', hours: 18, min: 14, max: 22 },
  taquari: { to: 'São Jerônimo', hours: 22, min: 18, max: 28 },
}

export function predictLevelForSaoJeronimo(upstreamData, currentLocalLevel) {
  if (!upstreamData) return null

  const predictions = []
  let highestRisk = 'normal'
  let highestPredictedLevel = currentLocalLevel || 0

  for (const [key, station] of Object.entries(upstreamData)) {
    if (!station || station.level === null) continue

    const travel = TRAVEL_TIME_HOURS[key]
    if (!travel) continue

    const trend = station.trend === 'rising' ? 1 : station.trend === 'falling' ? -1 : 0

    const predictedChange = trend * Math.abs(station.trendRate || 0) * travel.hours / 100

    const predictedLocalLevel = (currentLocalLevel || station.level) + predictedChange

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
    note: 'Previsão baseada na velocidade de subida/descida e tempo de percurso da onda de cheia.',
  }
}

export default {
  predictLevelForSaoJeronimo,
}
