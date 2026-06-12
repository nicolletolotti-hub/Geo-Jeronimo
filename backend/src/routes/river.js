import express from 'express'
import { fetchDefesaCivilData } from '../utils/defesaCivilApi.js'

const router = express.Router()

router.get('/current', async (req, res) => {
  try {
    const dcData = await fetchDefesaCivilData()
    const saoJeronimo = dcData?.['DCRS-00093']

    if (saoJeronimo?.level != null) {
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

    res.json({
      current: 0.58,
      timestamp: new Date().toISOString(),
      trend: 'stable',
      warningLevel: 5.0,
      dangerLevel: 7.0,
      source: 'REFERÊNCIA (São Jerônimo)',
    })
  } catch (error) {
    console.error('River API error:', error.message)
    res.json({
      current: 0.58,
      timestamp: new Date().toISOString(),
      trend: 'stable',
      warningLevel: 5.0,
      dangerLevel: 7.0,
      source: 'REFERÊNCIA',
    })
  }
})

router.get('/history', async (req, res) => {
  try {
    const result = await fetchDefesaCivilData()
    if (result?.['DCRS-00093']?.level != null) {
      return res.json({
        data: [{ level: result['DCRS-00093'].level, timestamp: new Date().toISOString() }],
        statistics: {
          current: result['DCRS-00093'].level,
          trend: result['DCRS-00093'].trend,
        },
        source: 'Defesa Civil RS',
      })
    }
    res.json({ data: [], statistics: null })
  } catch {
    res.json({ data: [], statistics: null })
  }
})

export default router
