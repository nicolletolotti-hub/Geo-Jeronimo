export function calcTrendRate(riverCurrent, stationsData) {
  const stationTrend = stationsData?.stations?.local?.[0]?.trendRate
  if (stationTrend != null) return stationTrend
  return 0
}

export function calcPrediction(currentLevel, trendRateCmh, targetLevel) {
  if (trendRateCmh <= 0 || targetLevel <= currentLevel) return null
  const hours = (targetLevel - currentLevel) / (trendRateCmh / 100)
  if (hours > 720) return null
  return {
    hours,
    hoursLabel: hours >= 24
      ? `${(hours / 24).toFixed(1)}d ${(hours % 24).toFixed(0)}h`
      : `${hours.toFixed(1)}h`,
    targetLevel,
  }
}


