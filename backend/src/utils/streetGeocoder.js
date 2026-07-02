/**
 * streetGeocoder.js
 *
 * As planilhas de saúde dos ACS não trazem lat/long — só o nome da rua
 * (aba da planilha) e o número da casa. Sem uma base de numeração predial,
 * o melhor que dá pra fazer automaticamente é geocodificação por RUA:
 * casar o nome da aba com `ruas/ruas.geojson` (OpenStreetMap) e usar um
 * ponto sobre a rua como aproximação da posição de todas as casas dela.
 *
 * Isso é suficiente pra estimar risco de enchente (a inundação afeta a
 * rua inteira, não varia metro a metro), mas não é o endereço exato da
 * casa. Quando o nome não casa com segurança, devolve null — a resolução
 * fica para uma revisão manual do agente (ajustar o pino no mapa), não
 * implementada nesta etapa.
 */
import * as turf from '@turf/turf'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const RUAS_PATH = path.join(__dirname, '../data/ruas/ruas.geojson')

const STREET_PREFIXES = /^(rua|r|avenida|av|travessa|tv|rodovia|estrada|beco|alameda|al|servidao|servid[aã]o)\.?\s+/

function normalizeStreetName(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .split(',')[0] // corta ", nº X" se vier junto no nome da aba
    .replace(STREET_PREFIXES, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

let ruasIndex = null

function loadIndex() {
  if (ruasIndex) return ruasIndex
  ruasIndex = new Map()
  try {
    const data = JSON.parse(fs.readFileSync(RUAS_PATH, 'utf8'))
    for (const feature of data.features || []) {
      const name = feature.properties?.name
      const norm = normalizeStreetName(name)
      if (!norm) continue
      if (!ruasIndex.has(norm)) ruasIndex.set(norm, [])
      ruasIndex.get(norm).push(feature)
    }
  } catch {
    ruasIndex = new Map()
  }
  return ruasIndex
}

/**
 * @returns {{ lat: number, lng: number, matchedName: string } | null}
 */
export function geocodeStreet(streetName) {
  const index = loadIndex()
  const norm = normalizeStreetName(streetName)
  if (!norm) return null

  let candidates = index.get(norm)

  if (!candidates) {
    // Sem match exato: tenta substring, mas só aceita se resolver pra um
    // único nome de rua distinto (evita casar com a rua errada).
    const distinctKeys = [...new Set(
      [...index.keys()].filter(k => k.includes(norm) || norm.includes(k))
    )]
    if (distinctKeys.length !== 1) return null
    candidates = index.get(distinctKeys[0])
  }

  if (!candidates || candidates.length === 0) return null

  try {
    const point = turf.pointOnFeature(turf.featureCollection(candidates))
    const [lng, lat] = point.geometry.coordinates
    return { lat, lng, matchedName: candidates[0].properties?.name || streetName }
  } catch {
    return null
  }
}
