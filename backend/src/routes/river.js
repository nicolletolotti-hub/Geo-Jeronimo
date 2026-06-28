import express from 'express'
import { fetchDefesaCivilData, fetchStationHistory } from '../utils/defesaCivilApi.js'
import db from '../database/db.js'
import { runQuery, runRun } from '../database/helpers.js'

const router = express.Router()

router.get('/current', async (req, res) => {
  try {
    const dcData = await fetchDefesaCivilData()
    const saoJeronimo = dcData?.['DCRS-00093']

    if (saoJeronimo?.level != null) {
      runRun(db,
        `INSERT INTO river_levels (level, source)
         SELECT $1, $2
         WHERE NOT EXISTS (
           SELECT 1 FROM river_levels
           WHERE source = $2 AND timestamp > NOW() - INTERVAL '14 minutes'
         )`,
        [saoJeronimo.level, 'Defesa Civil RS (DCRS-00093)']
      ).catch(() => {})

      return res.json({
        current: saoJeronimo.level,
        timestamp: saoJeronimo.timestamp || new Date().toISOString(),
        trend: saoJeronimo.trend,
        warningLevel: 5.0,
        dangerLevel: 7.0,
        source: 'Defesa Civil RS (DCRS-00093)',
        stationCode: 'DCRS-00093',
        monitoringUrl: 'https://dcrs.quallecontrol.com.br/Estacao/DCRS-00093',
      })
    }

    res.status(503).json({ error: 'Dados do rio indisponíveis no momento' })
  } catch (error) {
    console.error('River API error:', error.message)
    res.status(503).json({ error: 'Dados do rio indisponíveis no momento' })
  }
})

router.get('/history', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24
    const dcData = await fetchDefesaCivilData().catch(() => null)
    const currentLevel = dcData?.['DCRS-00093']?.level

    const dcHistory = await fetchStationHistory('DCRS-00093', hours).catch(() => [])

    if (dcHistory.length > 0) {
      const levels = dcHistory.map(r => r.level)
      const avg = levels.reduce((a, b) => a + b, 0) / levels.length
      const first = levels[0]
      const last = levels[levels.length - 1]
      const change = last - first
      const changePercent = first !== 0 ? ((change / first) * 100).toFixed(1) : '0.0'

      return res.json({
        data: dcHistory.map(r => ({ level: r.level, timestamp: r.timestamp })),
        statistics: {
          current: currentLevel || last,
          average: parseFloat(avg.toFixed(2)),
          minimum: parseFloat(Math.min(...levels).toFixed(2)),
          maximum: parseFloat(Math.max(...levels).toFixed(2)),
          change: parseFloat(change.toFixed(2)),
          changePercent,
          readings: levels.length,
          period: `${hours}h`,
          trend: change > 0.01 ? 'rising' : change < -0.01 ? 'falling' : 'stable',
        },
        source: 'Defesa Civil RS',
      })
    }

    try {
      const dbRecords = await runQuery(db,
        `SELECT level, timestamp FROM river_levels WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL ORDER BY timestamp ASC`,
        [Math.max(hours / 24, 1)]
      )
      if (dbRecords.length > 0) {
        const levels = dbRecords.map(r => r.level)
        const avg = levels.reduce((a, b) => a + b, 0) / levels.length
        const first = levels[0]
        const last = levels[levels.length - 1]
        const change = last - first
        return res.json({
          data: dbRecords.map(r => ({ level: r.level, timestamp: r.timestamp })),
          statistics: {
            current: currentLevel || last,
            average: parseFloat(avg.toFixed(2)),
            minimum: parseFloat(Math.min(...levels).toFixed(2)),
            maximum: parseFloat(Math.max(...levels).toFixed(2)),
            change: parseFloat(change.toFixed(2)),
            changePercent: first !== 0 ? ((change / first) * 100).toFixed(1) : '0.0',
            readings: levels.length,
            period: `${hours}h (banco local)`,
            trend: change > 0.01 ? 'rising' : change < -0.01 ? 'falling' : 'stable',
          },
          source: 'Banco local GeoJeronimo',
        })
      }
    } catch {}

    if (currentLevel != null) {
      const singlePoint = [{ level: currentLevel, timestamp: new Date().toISOString() }]
      return res.json({
        data: singlePoint,
        statistics: {
          current: currentLevel,
          average: currentLevel,
          minimum: currentLevel,
          maximum: currentLevel,
          change: 0,
          changePercent: '0.0',
          readings: 1,
          period: `${hours}h`,
          trend: dcData?.['DCRS-00093']?.trend || 'stable',
        },
        source: 'Defesa Civil RS',
      })
    }

    res.status(503).json({ data: [], statistics: null, error: 'Histórico indisponível' })
  } catch {
    res.status(503).json({ data: [], statistics: null, error: 'Histórico indisponível' })
  }
})

router.get('/trend', async (req, res) => {
  try {
    const dcData = await fetchDefesaCivilData()
    const saoJeronimo = dcData?.['DCRS-00093']
    if (!saoJeronimo?.level) {
      return res.status(503).json({ error: 'Dados indisponíveis' })
    }

    const currentLevel = saoJeronimo.level
    const currentTrend = saoJeronimo.trend
    const currentTimestamp = saoJeronimo.timestamp || new Date().toISOString()

    const history = await fetchStationHistory('DCRS-00093', 72)

    const points = (history || [])
      .map(p => ({ level: p.level, timestamp: new Date(p.timestamp).getTime() }))
      .filter(p => !isNaN(p.timestamp) && p.level != null)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (points.length < 2) {
      return res.json({
        currentLevel, timestamp: currentTimestamp, trend: currentTrend, rateCmh: 0,
        projections: [
          { hours: 6, level: currentLevel },
          { hours: 12, level: currentLevel },
          { hours: 24, level: currentLevel },
        ],
        classification: 'normal', confidence: 'low',
        message: 'Dados históricos insuficientes para projeção precisa.',
      })
    }

    const now = Date.now()
    const windows = [
      { hours: 1, weight: 0.35 }, { hours: 3, weight: 0.30 },
      { hours: 6, weight: 0.20 }, { hours: 12, weight: 0.10 }, { hours: 24, weight: 0.05 },
    ]

    let totalWeight = 0
    let weightedRate = 0
    let risingWindows = 0
    let fallingWindows = 0

    for (const w of windows) {
      const cutoff = now - w.hours * 3600000
      const windowPoints = points.filter(p => p.timestamp >= cutoff)
      if (windowPoints.length >= 2) {
        const first = windowPoints[0].level
        const last = windowPoints[windowPoints.length - 1].level
        const elapsedHours = (windowPoints[windowPoints.length - 1].timestamp - windowPoints[0].timestamp) / 3600000
        if (elapsedHours > 0.1) {
          const rate = (last - first) / elapsedHours
          weightedRate += rate * w.weight
          totalWeight += w.weight
          if (rate > 0.001) risingWindows++
          else if (rate < -0.001) fallingWindows++
        }
      }
    }
    if (totalWeight > 0) weightedRate /= totalWeight

    const totalWindows = windows.filter(w => {
      const cutoff = now - w.hours * 3600000
      return points.filter(p => p.timestamp >= cutoff).length >= 2
    }).length
    const consistency = totalWindows > 0 ? Math.max(risingWindows, fallingWindows) / totalWindows : 0

    const projectionHours = [6, 12, 24]
    const projections = projectionHours.map(hours => {
      const damp = 1 / (1 + hours * 0.04)
      return {
        hours, level: Math.max(0, Math.round((currentLevel + weightedRate * hours * damp) * 100) / 100),
        dampeningFactor: Math.round(damp * 100) / 100,
      }
    })

    const rateCmh = Math.round(Math.abs(weightedRate) * 10000) / 100
    let trend = 'stable'
    if (weightedRate > 0.005) trend = 'rising'
    else if (weightedRate < -0.005) trend = 'falling'

    const maxProjection = Math.max(...projections.map(p => p.level))
    let classification = 'normal', classificationLabel = 'Normal', classificationColor = 'text-emerald-400', classificationBg = 'bg-emerald-500/10'
    if (trend === 'rising' && maxProjection >= 9) {
      classification = 'alerta'; classificationLabel = 'ALERTA'; classificationColor = 'text-red-400'; classificationBg = 'bg-red-500/10'
    } else if (trend === 'rising' && maxProjection >= 6) {
      classification = 'atencao'; classificationLabel = 'ATENÇÃO'; classificationColor = 'text-amber-400'; classificationBg = 'bg-amber-500/10'
    }

    const floodLevelsReached = []
    for (let l = 4; l <= 15; l = Math.round((l + 0.2) * 5) / 5) {
      if (currentLevel < l && maxProjection >= l) floodLevelsReached.push(l)
    }

    let confidence = 'medium'
    let message = null
    if (points.length < 10) { confidence = 'low'; message = 'Poucos dados históricos. A projeção pode ser imprecisa.' }
    else if (consistency > 0.7) confidence = 'high'

    let floodWarning = null
    const relevantLevels = floodLevelsReached.filter(l => l >= 4)
    if (relevantLevels.length > 0) {
      floodWarning = {
        level: relevantLevels[0],
        message: `Com a tendência atual, áreas abaixo de ${relevantLevels[0].toFixed(1)}m podem apresentar risco nas próximas horas.`,
      }
    }

    res.json({
      currentLevel, timestamp: currentTimestamp, trend, rateCmh,
      consistency: Math.round(consistency * 100) / 100,
      projections, classification, classificationLabel, classificationColor, classificationBg,
      confidence, message, floodWarning, dataPoints: points.length, source: 'Defesa Civil RS',
    })
  } catch (error) {
    console.error('Trend API error:', error.message)
    res.status(503).json({ error: 'Erro ao calcular tendência' })
  }
})

export default router
