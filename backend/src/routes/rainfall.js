import express from 'express'
import axios from 'axios'
import { fetchDefesaCivilData } from '../utils/defesaCivilApi.js'

const router = express.Router()

router.get('/history', async (req, res) => {
  try {
    const dcData = await fetchDefesaCivilData()
    const saoJeronimo = dcData?.['DCRS-00093']
    const rainfall = saoJeronimo?.rainfall

    const last24h = rainfall?.h24 ?? null
    const last7d = rainfall?.h168 ?? null

    let last20d = null
    try {
      const end = new Date()
      const start = new Date(Date.now() - 20 * 86400000)
      const fmt = (d) => d.toISOString().slice(0, 10)
      const archResp = await axios.get('https://archive-api.open-meteo.com/v1/archive', {
        params: {
          latitude: -29.96,
          longitude: -51.72,
          start_date: fmt(start),
          end_date: fmt(end),
          daily: 'precipitation_sum',
          timezone: 'America/Sao_Paulo',
        },
        timeout: 5000,
      })
      const sums = archResp.data?.daily?.precipitation_sum
      if (sums) {
        last20d = parseFloat(sums.reduce((a, b) => a + (b || 0), 0).toFixed(1))
      }
    } catch { }

    res.json({
      last24h,
      last7d,
      last20d,
      timestamp: new Date().toISOString(),
      source: last24h != null ? 'Defesa Civil RS' : 'indisponível',
    })
  } catch {
    res.status(503).json({ error: 'Dados de chuva indisponíveis' })
  }
})

export default router
