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
        'INSERT INTO river_levels (level, source) VALUES ($1, $2)',
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
      const isSqlite = db.type === 'sqlite'
      const dbRecords = await runQuery(db,
        isSqlite
          ? `SELECT level, timestamp FROM river_levels WHERE timestamp >= datetime('now', '-' || $1 || ' hours') ORDER BY timestamp ASC`
          : `SELECT level, timestamp FROM river_levels WHERE timestamp >= NOW() - ($1 || ' days')::INTERVAL ORDER BY timestamp ASC`,
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

export default router
