import db from '../database/db.js'
import { createLogger } from '../utils/logger.js'

const { log } = createLogger('station-data.log')

const STATION_CODE_MAP = {
  'DCRS-00093': 'São Jerônimo',
  'DCRS-00028': 'Rio Pardo',
  'DCRS-00102': 'Dona Francisca',
  'DCRS-00104': 'Arroio do Meio/Lajeado',
  'DCRS-00123': 'Arroio do Meio',
}

/**
 * Persiste snapshot das estações da Defesa Civil RS (máx. 1 registro por estação a cada 14 min).
 */
export async function persistStationSnapshots(dcData) {
  if (!dcData || typeof dcData !== 'object') return 0

  let saved = 0
  for (const [code, station] of Object.entries(dcData)) {
    if (code.startsWith('_') || !station) continue

    const stationName = station.station || STATION_CODE_MAP[code] || code
    try {
      const result = await db.query(
        `INSERT INTO station_data (station, level, trend, trend_rate, status, percentage, source)
         SELECT $1, $2, $3, $4, $5, $6, $7
         WHERE NOT EXISTS (
           SELECT 1 FROM station_data
           WHERE station = $1 AND recorded_at > NOW() - INTERVAL '14 minutes'
         )`,
        [
          stationName,
          station.level,
          station.trend || 'stable',
          station.trendRate ?? 0,
          station.status || 'normal',
          station.percentage ?? 0,
          station.source || 'Defesa Civil RS (GraphQL)',
        ],
      )
      saved += result.rowCount ?? 0
    } catch (err) {
      log(`Failed to save station ${stationName}:`, err.message)
    }
  }
  return saved
}

export default { persistStationSnapshots }
