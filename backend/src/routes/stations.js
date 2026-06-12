import express from 'express'
import { getUpstreamStations, getDownstreamStations, DCRS093 } from '../utils/scraper.js'
import { fetchDefesaCivilData, fetchStationHistory } from '../utils/defesaCivilApi.js'
import { predictLevelForSaoJeronimo } from '../utils/prediction.js'
import pool from '../database/connection.js'

const router = express.Router()

function getStatus(level) {
  if (level == null) return { status: 'unknown', percentage: 0 }
  if (level >= 7) return { status: 'danger', percentage: 100 }
  if (level >= 5.5) return { status: 'warning', percentage: 78 }
  if (level >= 4) return { status: 'alert', percentage: 57 }
  if (level >= 3) return { status: 'attention', percentage: 43 }
  return { status: 'normal', percentage: Math.max(0, Math.round((level / 3) * 100)) }
}

async function saveData(station, data) {
  try {
    await pool.query(
      `INSERT INTO station_data (station, level, trend, trend_rate, status, percentage, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [station, data.level, data.trend || 'stable', data.trendRate || 0, data.status || 'normal', data.percentage || 0, data.source || 'unknown']
    )
  } catch (e) {
    console.error(`DB save error (${station}):`, e.message)
  }
}

async function getRecentHistory(station, limit = 5) {
  try {
    const result = await pool.query(
      `SELECT level, trend, trend_rate, status, percentage, source, recorded_at
       FROM station_data WHERE station = $1 ORDER BY recorded_at DESC LIMIT $2`,
      [station, limit]
    )
    return result.rows
  } catch { return [] }
}

router.get('/', async (req, res) => {
  try {
    const [defesaCivilData, nivelGuaibaUpstream, nivelGuaibaDownstream, history] = await Promise.all([
      fetchDefesaCivilData(),
      getUpstreamStations(),
      getDownstreamStations(),
      getRecentHistory('São Jerônimo'),
    ])

    const defesaSaoJeronimo = defesaCivilData?.['DCRS-00093']
    const defesaRioPardo = defesaCivilData?.['DCRS-00028']
    const defesaDonaFrancisca = defesaCivilData?.['DCRS-00102']

    const currentLevel = defesaSaoJeronimo?.level ?? (history[0]?.level ?? null)
    const status = getStatus(currentLevel)

    const saoJeronimo = {
      station: 'São Jerônimo',
      code: 'DCRS-00093',
      river: 'Jacuí',
      level: currentLevel,
      ...status,
      trend: defesaSaoJeronimo?.trend || history[0]?.trend || 'stable',
      trendRate: defesaSaoJeronimo?.trendRate || history[0]?.trend_rate || 0,
      source: defesaSaoJeronimo?.source || 'ANA',
      timestamp: new Date().toISOString(),
      recentHistory: history.map(r => ({
        level: r.level,
        trend: r.trend,
        recordedAt: r.recorded_at,
      })),
      monitoringUrl: 'https://dcrs.quallecontrol.com.br/Estacao/DCRS-00093',
    }

    const rioPardo = defesaRioPardo || {
      station: 'Rio Pardo',
      river: 'Jacuí',
      level: null,
      source: 'Defesa Civil RS',
      status: 'unknown',
      percentage: 0,
    }

    const upstream = [
      defesaDonaFrancisca || nivelGuaibaUpstream.donaFrancisca,
      rioPardo,
      nivelGuaibaUpstream.cachoeiraDoSul,
    ].filter(Boolean)

    const [dcHistory] = await Promise.all([
      currentLevel ? fetchStationHistory('DCRS-00093', 48).catch(() => []) : Promise.resolve([]),
    ])

    if (dcHistory.length > 0) {
      saoJeronimo.recentHistory = dcHistory
    }

    const prediction = predictLevelForSaoJeronimo(
      { donaFrancisca: defesaDonaFrancisca || nivelGuaibaUpstream.donaFrancisca, cachoeiraDoSul: nivelGuaibaUpstream.cachoeiraDoSul },
      currentLevel
    )

    const stations = {
      upstream,
      local: [saoJeronimo],
      downstream: [nivelGuaibaDownstream.portoAlegre].filter(Boolean),
    }

    for (const group of Object.values(stations)) {
      for (const s of group) {
        if (s?.level != null) await saveData(s.station, s)
      }
    }

    res.json({
      timestamp: new Date().toISOString(),
      stations,
      prediction,
      updateIntervalMinutes: 10,
      dataSources: ['Defesa Civil RS (GraphQL)', 'ANA/SGB (via Nível Guaíba)', 'Open-Meteo Flood API'],
      defesaCivilRS: {
        station: DCRS093,
        platform: 'https://dcrs.quallecontrol.com.br/',
      },
    })
  } catch (error) {
    console.error('Stations API error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.get('/history/:station', async (req, res) => {
  try {
    const { station } = req.params
    const hours = parseInt(req.query.hours) || 48

    if (station.includes('DCRS')) {
      const dcHistory = await fetchStationHistory(station, hours)
      if (dcHistory.length > 0) {
        return res.json({ station, hours, records: dcHistory, source: 'Defesa Civil RS' })
      }
    }

    const result = await pool.query(
      `SELECT level, trend, trend_rate, status, percentage, source, recorded_at
       FROM station_data WHERE station = $1
       AND recorded_at >= NOW() - make_interval(hours => $2)
       ORDER BY recorded_at ASC`,
      [station, hours]
    )
    res.json({ station, hours, records: result.rows })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
