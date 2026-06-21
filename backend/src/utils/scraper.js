import axios from 'axios'
import * as cheerio from 'cheerio'

const BASE_URL = 'https://nivelguaiba.com.br'

const CITY_PAGES = {
  'donafrancisca': { name: 'Dona Francisca', river: 'Jacuí', upstream: true, page: '/donafrancisca' },
  'cachoeiradosul': { name: 'Cachoeira do Sul', river: 'Jacuí', upstream: true, page: '/cachoeiradosul' },
  'portoalegre': { name: 'Porto Alegre', river: 'Guaíba', downstream: true, page: '/' },
}

const PATTERNS = {
  level: [
    /(\d+[.,]\d+)\s*m/i,
    /nível[^\d]*(\d+[.,]\d+)/i,
    /(\d+[.,]\d+)\s*metro/i,
  ],
  floodThreshold: [
    /cota de inundação[^\d]*(\d+[.,]\d+)/i,
    /inundação[^\d]*(\d+[.,]\d+)/i,
    /alerta[^\d]*(\d+[.,]\d+)/i,
  ],
  trend: [
    /(subindo|descendo|estável|estavel)\s*a?\s*([\d.,]+)?\s*cm/i,
    /(subindo|descendo|estável|estavel)/i,
  ],
}

function extractFirst(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p)
    if (m) return m
  }
  return null
}

async function scrapeCityPage(cityKey) {
  const config = CITY_PAGES[cityKey]
  if (!config) return null

  try {
    const response = await axios.get(`${BASE_URL}${config.page}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'GeoJeronimo/1.0' }
    })

    const html = response.data
    const $ = cheerio.load(html)
    const mainContent = $.text().replace(/\s+/g, ' ').trim()

    let level = null
    let trend = 0
    let trendDir = 'stable'
    let floodThreshold = null
    let status = 'normal'

    const levelMatch = extractFirst(mainContent, PATTERNS.level)
    if (levelMatch) {
      level = parseFloat(levelMatch[1].replace(',', '.'))
      if (level > 30) level = null
    }

    const floodMatch = extractFirst(mainContent, PATTERNS.floodThreshold)
    if (floodMatch) {
      floodThreshold = parseFloat(floodMatch[1].replace(',', '.'))
      if (floodThreshold > 30) floodThreshold = null
    }

    const trendMatch = extractFirst(mainContent, PATTERNS.trend)
    if (trendMatch) {
      trendDir = trendMatch[1].toLowerCase() === 'subindo' ? 'rising'
        : trendMatch[1].toLowerCase() === 'descendo' ? 'falling' : 'stable'
      if (trendMatch[2]) {
        trend = parseFloat(trendMatch[2].replace(',', '.'))
        if (trendDir === 'falling') trend = -trend
      }
    }

    if (mainContent.includes('Alagado') || mainContent.includes('alagado')) status = 'danger'
    else if (mainContent.includes('Alerta') || mainContent.includes('alerta')) status = 'warning'

    if (level == null && floodThreshold == null) return null

    return {
      station: config.name,
      river: config.river,
      level,
      trend: trendDir,
      trendRate: Math.abs(trend),
      floodThreshold,
      status,
      percentage: floodThreshold && level ? Math.min((level / floodThreshold) * 100, 100) : 0,
      timestamp: new Date().toISOString(),
      source: 'Nível Guaíba (ANA/SGB)',
      upstream: config.upstream || false,
      downstream: config.downstream || false,
    }
  } catch (error) {
    console.error(`Erro ao buscar dados de ${cityKey}:`, error.message)
    return null
  }
}

export async function getUpstreamStations() {
  const [donaFrancisca, cachoeiraDoSul] = await Promise.all([
    scrapeCityPage('donafrancisca'),
    scrapeCityPage('cachoeiradosul'),
  ])
  return { donaFrancisca, cachoeiraDoSul }
}

export async function getDownstreamStations() {
  const portoAlegre = await scrapeCityPage('portoalegre')
  return { portoAlegre }
}

export async function getStationData(stationKey) {
  return scrapeCityPage(stationKey)
}

export const DCRS093 = {
  station: 'São Jerônimo',
  code: 'DCRS093',
  river: 'Jacuí',
  latitude: -29.959,
  longitude: -51.723,
  source: 'Defesa Civil RS / Quallecontrol',
  monitoringUrl: 'https://dcrs.quallecontrol.com.br/Station/Details/DCRS093',
  description: 'Estação hidrometeorológica DCRS093 da Rede de Monitoramento da Defesa Civil do RS em São Jerônimo. Transmissão 4G/5G + satélite, dados a cada 10 segundos.',
  floodThreshold: 7.0,
  alertThreshold: 5.5,
  attentionThreshold: 4.0,
}

export default {
  getUpstreamStations,
  getDownstreamStations,
  getStationData,
  DCRS093,
}
