import { defesaCivilCache } from './cache.js'

const GRAPHQL_URL = 'https://dcrs-dados.quallecontrol.com.br/graphql'

const TAGS_QUERY = `query {
  tags_data(clients: ["casa-militar-defesa-civil-rs"]) {
    qualle_meteorologia {
      codigo
      name { general }
      timestamp
      position { latitude longitude }
      data {
        rio {
          rio_nivel { value }
          rio_nome { value }
          rio_nivel_tendencia { value }
          rio_vazao { value }
        }
        chuva {
          acumulado { min005 { value } h001 { value } h003 { value } h006 { value } h012 { value } h024 { value } h168 { value } }
        }
      }
    }
  }
}`

const STATIONS_OF_INTEREST = {
  'DCRS-00093': { station: 'São Jerônimo', river: 'Jacuí', threshold: 7.0 },
  'DCRS-00028': { station: 'Rio Pardo', river: 'Jacuí', threshold: 7.0 },
  'DCRS-00102': { station: 'Dona Francisca', river: 'Jacuí', threshold: 7.5 },
  'DCRS-00104': { station: 'Arroio do Meio/Lajeado', river: 'Taquari', threshold: 10.0 },
  'DCRS-00123': { station: 'Arroio do Meio', river: 'Taquari', threshold: 10.0 },
}

export async function fetchDefesaCivilData() {
  const fresh = defesaCivilCache.get('defesaCivilData')
  if (fresh) return fresh
  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: TAGS_QUERY }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      const stale = defesaCivilCache.getStale('defesaCivilData')
      if (stale) return { ...stale.value, _stale: true }
      return null
    }

    const json = await response.json()
    const stations = json?.data?.tags_data?.qualle_meteorologia || []

    const result = {}
    for (const s of stations) {
      const config = STATIONS_OF_INTEREST[s.codigo]
      if (!config) continue

      const level = s.data?.rio?.rio_nivel?.value
      const trendValue = s.data?.rio?.rio_nivel_tendencia?.value
      const trend = trendValue != null
        ? (trendValue > 0.001 ? 'rising' : trendValue < -0.001 ? 'falling' : 'stable')
        : 'stable'
      const trendRate = trendValue != null ? Math.abs(trendValue) : 0
      const threshold = config.threshold
      const levelNum = level != null ? parseFloat(level.toFixed(2)) : null

      let status = 'normal'
      if (levelNum != null && threshold) {
        if (levelNum >= threshold) status = 'danger'
        else if (levelNum >= threshold * 0.8) status = 'warning'
        else if (levelNum >= threshold * 0.6) status = 'alert'
      }

      if (s.codigo === 'DCRS-00102') continue
      if (levelNum != null && levelNum > 20) continue

      const chuva = s.data?.chuva?.acumulado
      const rainfall = chuva ? {
        min5: chuva.min005?.value ?? null,
        h1: chuva.h001?.value ?? null,
        h3: chuva.h003?.value ?? null,
        h6: chuva.h006?.value ?? null,
        h12: chuva.h012?.value ?? null,
        h24: chuva.h024?.value ?? null,
        h168: chuva.h168?.value ?? null,
      } : null

      result[s.codigo] = {
        station: config.station,
        river: config.river,
        code: s.codigo,
        level: levelNum,
        trend,
        trendRate: parseFloat(trendRate.toFixed(4)),
        floodThreshold: threshold,
        status,
        percentage: threshold && levelNum ? Math.min((levelNum / threshold) * 100, 100) : 0,
        rainfall,
        timestamp: s.timestamp || new Date().toISOString(),
        source: 'Defesa Civil RS (GraphQL)',
      }
    }

    defesaCivilCache.set('defesaCivilData', result)
    return result
  } catch (error) {
    console.error('Defesa Civil API error:', error.message)
    const stale = defesaCivilCache.getStale('defesaCivilData')
    if (stale) return { ...stale.value, _stale: true }
    return null
  }
}

export async function fetchStationHistory(stationCode, hours = 24) {
  const cacheKey = `stationHistory:${stationCode}:${hours}`
  const cached = defesaCivilCache.get(cacheKey)
  if (cached) return cached

  const endDate = new Date().toISOString()
  const startDate = new Date(Date.now() - hours * 3600000).toISOString()
  const interval = hours <= 1 ? 'MIN_5' : hours <= 6 ? 'MIN_10' : hours <= 24 ? 'HOUR_1' : 'HOUR_3'

  const query = `query {
    historic(
      system: Qualle_Hidrometeorologia
      client: "casa-militar-defesa-civil-rs"
      stationCode: "${stationCode}"
      startDate: "${startDate}"
      endDate: "${endDate}"
      interval: ${interval}
      opts: { ordenacao: ASC }
    )
  }`

  try {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return []
    const json = await response.json()
    const data = json?.data?.historic
    if (typeof data === 'string') {
      return JSON.parse(data).map(r => ({
        level: r.valor,
        timestamp: r.dataHora,
      }))
    }
    if (Array.isArray(data)) {
      const result = data.map(r => ({ level: r.valor, timestamp: r.dataHora }))
      defesaCivilCache.set(cacheKey, result, 120_000)
      return result
    }
    return []
  } catch (error) {
    console.error('Defesa Civil history error:', error.message)
    return []
  }
}

export default {
  fetchDefesaCivilData,
  fetchStationHistory,
}
