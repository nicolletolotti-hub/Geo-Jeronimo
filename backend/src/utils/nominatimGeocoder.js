/**
 * nominatimGeocoder.js
 *
 * Segunda tentativa de geocodificação, usada só quando streetGeocoder.js
 * (match local contra ruas.geojson) não encontra a rua — algumas ruas reais
 * das planilhas dos ACS não estão na extração do OpenStreetMap usada em
 * ruas.geojson (ex.: "Helbert Schreinert", "07 de Setembro"), mas existem
 * na base pública do Nominatim.
 *
 * Uso restrito à política do Nominatim (nominatim.org/release-docs/latest/api/Search/):
 * User-Agent identificando o app, no máximo 1 requisição por segundo, sem
 * uso em massa automatizado — por isso isso só roda quando um agente clica
 * um botão manualmente (não em background), sempre sequencial com uma
 * pausa entre chamadas.
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'GeoJeronimo/1.0 (sistema de monitoramento de cheias de São Jerônimo/RS; contato via painel administrativo)'

// São Jerônimo, RS — bounding box aproximado (viewbox), pra priorizar
// resultados na região certa em vez de outra "Rua X" em outro município.
const VIEWBOX = '-51.83,-29.90,-51.60,-30.05' // left,top,right,bottom

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * @param {string} query - endereço a buscar (ex.: "Helbert Schreinert, São Jerônimo, RS, Brasil")
 * @returns {Promise<{ lat: number, lng: number, displayName: string } | null>}
 */
export async function geocodeViaNominatim(query) {
  try {
    const url = new URL(NOMINATIM_URL)
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', '1')
    url.searchParams.set('countrycodes', 'br')
    url.searchParams.set('viewbox', VIEWBOX)
    url.searchParams.set('bounded', '1')

    const response = await fetch(url.toString(), {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null

    const results = await response.json()
    if (!Array.isArray(results) || results.length === 0) return null

    const best = results[0]
    return {
      lat: parseFloat(best.lat),
      lng: parseFloat(best.lon),
      displayName: best.display_name,
    }
  } catch {
    return null
  }
}

/**
 * Geocodifica uma lista de endereços sequencialmente, respeitando o limite
 * de 1 req/s do Nominatim. Uso pensado pra ser disparado manualmente por um
 * agente (botão "geocodificar automaticamente"), não em cron/background.
 *
 * @param {{ id: number, query: string }[]} items
 * @param {(result: { id: number, geo: object|null }) => void} [onEach] - callback opcional por item
 */
export async function geocodeBatch(items, onEach) {
  const results = []
  for (const item of items) {
    const geo = await geocodeViaNominatim(item.query)
    results.push({ id: item.id, geo })
    if (onEach) onEach({ id: item.id, geo })
    await sleep(1100) // > 1 req/s, com folga
  }
  return results
}
