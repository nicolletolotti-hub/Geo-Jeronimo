const TRAVEL_TIME_HOURS = {
  donaFrancisca: { to: 'São Jerônimo', hours: 28, min: 24, max: 30, attenuation: 0.10 },
  cachoeiraDoSul: { to: 'São Jerônimo', hours: 18, min: 14, max: 22, attenuation: 0.20 },
  taquari: { to: 'São Jerônimo', hours: 22, min: 18, max: 28, attenuation: 0.15 },
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
    const baseLevel = currentLocalLevel || station.level

    const waterMassDiff = Math.max(0, station.level - baseLevel)
    const diffContribution = waterMassDiff * travel.attenuation

    const trendContribution = trend * Math.abs(station.trendRate || 0) * travel.hours / 100

    const predictedLocalLevel = baseLevel + diffContribution + trendContribution
    const totalChange = predictedLocalLevel - baseLevel

    predictions.push({
      from: station.station,
      currentLevel: station.level,
      trend: station.trend,
      trendRate: station.trendRate,
      travelTimeHours: travel.hours,
      travelTimeMin: travel.min,
      travelTimeMax: travel.max,
      predictedChange: parseFloat(totalChange.toFixed(2)),
      predictedLocalLevel: parseFloat(Math.max(0.1, predictedLocalLevel).toFixed(2)),
      arrivalWindow: `${travel.min}-${travel.max}h`,
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
    note: 'Previsão considerando o volume de água acumulado a montante e a velocidade de subida. Válida apenas para curto prazo (próximas horas).',
  }
}

export default {
  predictLevelForSaoJeronimo,
}
