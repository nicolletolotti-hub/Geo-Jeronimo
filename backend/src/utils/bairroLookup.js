/**
 * bairroLookup.js
 *
 * Descobre em qual bairro um ponto (lat/lng) cai, via point-in-polygon
 * contra `bairros.json` (18 polígonos, ver `bairros/bairros.json` na raiz
 * do repo). Cópia local em `backend/src/data/bairros/` pelo mesmo motivo de
 * `floodRisk.js`/`streetGeocoder.js`: o build do Railway só enxerga a pasta
 * `backend/` (ver railway.toml).
 *
 * Usado no import de planilhas de saúde pra detectar o bairro de cada rua
 * automaticamente em vez de depender de um único bairro informado pra
 * planilha inteira — na prática, planilhas reais dos ACS cruzam vários
 * bairros (ex.: micro área 25 cobre 5 bairros diferentes).
 */
import * as turf from '@turf/turf'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const BAIRROS_PATH = path.join(__dirname, '../data/bairros/bairros.json')

let bairrosData = null

function loadBairros() {
  if (bairrosData) return bairrosData
  try {
    bairrosData = JSON.parse(fs.readFileSync(BAIRROS_PATH, 'utf8'))
  } catch {
    bairrosData = { features: [] }
  }
  return bairrosData
}

/**
 * @returns {string|null} nome do bairro (properties.nome) que contém o
 * ponto, ou null se o ponto não cair em nenhum polígono conhecido.
 */
export function findBairroForPoint(lat, lng) {
  if (lat == null || lng == null) return null
  const data = loadBairros()
  const pt = turf.point([lng, lat])
  for (const feature of data.features || []) {
    try {
      if (turf.booleanPointInPolygon(pt, feature)) return feature.properties?.nome || null
    } catch {
      continue
    }
  }
  return null
}
