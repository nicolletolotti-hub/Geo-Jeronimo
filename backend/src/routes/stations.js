import express from 'express'
import { getUpstreamStations, getDownstreamStations, DCRS093 } from '../utils/scraper.js'
import { fetchDefesaCivilData, fetchStationHistory } from '../utils/defesaCivilApi.js'
import { predictLevelForSaoJeronimo } from '../utils/prediction.js'

const router = express.Router()

function getStatus(level) {
  if (level == null) return { status: 'unknown', percentage: 0 }
  if (level >= 7) return { status: 'danger', percentage: 100 }
  if (level >= 5.5) return { status: 'warning', percentage: 78 }
  if (level >= 4) return { status: 'alert', percentage: 57 }
  if (level >= 3) return { status: 'attention', percentage: 43 }
  return { status: 'normal', percentage: Math.max(0, Math.round((level / 3) * 100)) }
}

async function safePromise(promise, fallback = null) {
  try { return await promise } catch { return fallback }
}

router.get('/', async (req, res) => {
  try {
    const [defesaCivilData, nivelGuaibaUpstream, nivelGuaibaDownstream] = await Promise.allSettled([
      fetchDefesaCivilData(),
      getUpstreamStations(),
      getDownstreamStations(),
    ])

    const dcData = defesaCivilData.status === 'fulfilled' ? defesaCivilData.value : null
    const upstreamScraper = nivelGuaibaUpstream.status === 'fulfilled' ? nivelGuaibaUpstream.value : { donaFrancisca: null, cachoeiraDoSul: null }
    const downstreamScraper = nivelGuaibaDownstream.status === 'fulfilled' ? nivelGuaibaDownstream.value : { portoAlegre: null }

    const defesaSaoJeronimo = dcData?.['DCRS-00093']
    const defesaRioPardo = dcData?.['DCRS-00028']
    const defesaTaquari = dcData?.['DCRS-00027']
    const defesaCai = dcData?.['DCRS-00079']

    const currentLevel = defesaSaoJeronimo?.level ?? null
    const status = getStatus(currentLevel)

    const saoJeronimo = {
      station: 'São Jerônimo',
      code: 'DCRS-00093',
      river: 'Jacuí',
      level: currentLevel,
      ...status,
      trend: defesaSaoJeronimo?.trend || 'stable',
      trendRate: defesaSaoJeronimo?.trendRate || 0,
      source: defesaSaoJeronimo?.source || 'Defesa Civil RS',
      timestamp: new Date().toISOString(),
      monitoringUrl: 'https://dcrs.quallecontrol.com.br/Estacao/DCRS-00093',
    }

    const rioPardo = defesaRioPardo || {
      station: 'Rio Pardo',
      code: 'DCRS-00028',
      river: 'Jacuí',
      level: null,
      source: 'Defesa Civil RS',
      status: 'unknown',
      percentage: 0,
    }

    const upstream = [
      upstreamScraper.donaFrancisca,
      rioPardo,
      upstreamScraper.cachoeiraDoSul,
      defesaTaquari ? { ...defesaTaquari, station: 'Estrela', code: 'DCRS-00027', river: 'Taquari' } : null,
      defesaCai ? { ...defesaCai, station: 'São Sebastião do Caí', code: 'DCRS-00079', river: 'Caí' } : null,
    ].filter(Boolean)

    const dcHistory = await safePromise(fetchStationHistory('DCRS-00093', 48), [])
    if (dcHistory.length > 0) {
      saoJeronimo.recentHistory = dcHistory
    }

    const prediction = predictLevelForSaoJeronimo(
      { donaFrancisca: upstreamScraper.donaFrancisca, cachoeiraDoSul: upstreamScraper.cachoeiraDoSul },
      currentLevel
    )

    const stations = {
      upstream,
      local: [saoJeronimo],
      downstream: [downstreamScraper.portoAlegre].filter(Boolean),
    }

    res.json({
      timestamp: new Date().toISOString(),
      stations,
      prediction,
      updateIntervalMinutes: 10,
      dataSources: ['Defesa Civil RS (GraphQL)', 'ANA/SGB (via Nível Guaíba)'],
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
      const dcHistory = await safePromise(fetchStationHistory(station, hours), [])
      if (dcHistory.length > 0) {
        return res.json({ station, hours, records: dcHistory, source: 'Defesa Civil RS' })
      }
    }

    res.json({ station, hours, records: [], source: 'indisponível' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

export default router
