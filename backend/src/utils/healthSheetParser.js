/**
 * healthSheetParser.js
 *
 * Parser dedicado ao formato real das planilhas de saúde enviadas pelos
 * Agentes Comunitários de Saúde (ACS): uma aba por rua, uma linha por
 * morador, com o número da casa preenchido apenas na primeira linha de
 * cada grupo familiar.
 *
 * Este módulo é puro (não toca banco de dados nem HTTP), o que permite
 * testá-lo isoladamente contra planilhas reais antes de conectar à rota.
 */

function normalizeHeaderToken(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

// Mapa de cabeçalhos conhecidos -> campo interno.
// Baseado nas 3 planilhas reais analisadas (micro áreas 21, 23 e 25),
// que variam levemente entre si (nem todas têm "Oxigênio" ou "PCD").
const HEADER_FIELD_MAP = {
  n_da_casa: 'houseNumber',
  no_da_casa: 'houseNumber',
  moradores: 'name',
  has: 'has',
  hipertensao: 'has',
  pressao_alta: 'has',
  dm: 'dm',
  diabetes: 'dm',
  diabetico: 'dm',
  diabetica: 'dm',
  outros_problemas_de_saude: 'outros',
  gestante: 'gestante',
  idoso: 'idoso',
  acamado: 'acamado',
  domiciliado: 'domiciliado',
  oxigenio: 'oxigenio',
  pcd: 'pcd',
}

function mapHeader(h) {
  const norm = normalizeHeaderToken(h)
  if (norm.startsWith('criancas')) return 'criancas'
  return HEADER_FIELD_MAP[norm] || null
}

/**
 * Detecta se uma aba está no formato "listagem de saúde por rua".
 * Procura, nas 3 primeiras linhas, uma linha de cabeçalho que contenha
 * "moradores" e pelo menos um marcador de saúde (has/dm).
 */
function findHeaderRow(rows) {
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const mapped = rows[i].map(mapHeader)
    if (mapped.includes('name') && (mapped.includes('has') || mapped.includes('dm'))) {
      return i
    }
  }
  return -1
}

function isBlank(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

function isMarked(v) {
  if (isBlank(v)) return false
  const s = String(v).trim().toLowerCase()
  return s === 'x' || s === 'sim' || s === '1' || s === 'true'
}

function cleanName(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim()
}

function cleanHouseNumber(v) {
  return String(v ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Converte uma aba (array de arrays, via sheet_to_json com header:1) no
 * formato de listagem de saúde em uma lista de "casas" prontas para
 * inserção em `residences`, cada uma com `householdMembers` (JSON) já
 * no formato usado pelo cadastro do cidadão/agente (ResidenceWizard).
 *
 * @param {string} streetName - nome da rua (normalmente o nome da aba)
 * @param {any[][]} rows - linhas cruas da planilha
 * @returns {{ houses: object[], warnings: string[] }}
 */
function parseHealthSheet(streetName, rows) {
  const warnings = []
  if (rows.length === 0) {
    return { houses: [], warnings: [] }
  }
  const headerIdx = findHeaderRow(rows)
  if (headerIdx === -1) {
    return { houses: [], warnings: [`Aba "${streetName}": cabeçalho não reconhecido (formato inesperado), aba ignorada`] }
  }

  const fields = rows[headerIdx].map(mapHeader)
  const dataRows = rows.slice(headerIdx + 1)

  const groups = []
  let current = null

  for (const row of dataRows) {
    const cell = (field) => {
      const idx = fields.indexOf(field)
      return idx === -1 ? undefined : row[idx]
    }

    const rawHouseNumber = cell('houseNumber')
    const rawName = cell('name')

    // Linha totalmente em branco = separador entre casas.
    if (isBlank(rawHouseNumber) && isBlank(rawName)) {
      current = null
      continue
    }

    // Número de casa preenchido = início de um novo grupo familiar — a
    // menos que seja o MESMO número do grupo já aberto (alguns agentes
    // repetem o número da casa em toda linha da família, em vez de deixar
    // em branco depois da primeira; sem essa checagem, cada morador virava
    // uma "casa" própria e os moradores 2+ eram descartados como duplicata
    // do endereço no import).
    if (!isBlank(rawHouseNumber)) {
      const cleaned = cleanHouseNumber(rawHouseNumber)
      if (!current || current.houseNumber !== cleaned) {
        current = { houseNumber: cleaned, members: [] }
        groups.push(current)
      }
    }

    // Sem número de casa e sem grupo aberto: linha órfã, não deveria
    // acontecer nos arquivos reais, mas não derruba a importação.
    if (!current) {
      current = { houseNumber: '', members: [] }
      groups.push(current)
      warnings.push(`Aba "${streetName}": linha sem número de casa associado (nome: "${cleanName(rawName)}")`)
    }

    const name = cleanName(rawName)
    // Casa vaga: coluna "Moradores" vazia ou "0".
    if (isBlank(name) || name === '0') continue

    const healthMarkers = []
    let ageNote = ''
    let isChild = false

    if (isMarked(cell('has'))) healthMarkers.push('hipertensao')
    if (isMarked(cell('dm'))) healthMarkers.push('diabetes')
    if (isMarked(cell('gestante'))) healthMarkers.push('gestante')
    if (isMarked(cell('idoso'))) healthMarkers.push('idoso')
    if (isMarked(cell('acamado'))) healthMarkers.push('acamado')
    if (isMarked(cell('domiciliado'))) healthMarkers.push('domiciliado')
    if (isMarked(cell('oxigenio'))) healthMarkers.push('dependente_oxigenio')
    if (isMarked(cell('pcd'))) healthMarkers.push('pcd')

    const outrosRaw = cell('outros')
    if (!isBlank(outrosRaw)) healthMarkers.push('outras')

    const criancasRaw = cell('criancas')
    if (!isBlank(criancasRaw)) {
      isChild = true
      if (!isMarked(criancasRaw)) ageNote = cleanName(criancasRaw)
    }

    const note = !isBlank(outrosRaw) && !isMarked(outrosRaw) ? cleanName(outrosRaw) : ''

    current.members.push({ name, healthMarkers, isChild, ageNote, note })
  }

  const houses = groups
    .filter(g => g.members.length > 0)
    .map(g => {
      const hasElderly = g.members.some(m => m.healthMarkers.includes('idoso'))
      const hasChildren = g.members.some(m => m.isChild)
      const hasPregnant = g.members.some(m => m.healthMarkers.includes('gestante'))
      const hasDisabled = g.members.some(m => m.healthMarkers.includes('pcd'))
      const countHAS = g.members.filter(m => m.healthMarkers.includes('hipertensao')).length
      const countDM = g.members.filter(m => m.healthMarkers.includes('diabetes')).length

      const summaryParts = []
      if (countHAS) summaryParts.push(`${countHAS} com HAS`)
      if (countDM) summaryParts.push(`${countDM} com DM`)

      return {
        houseNumber: g.houseNumber,
        address: `${streetName}, nº ${g.houseNumber}`.trim(),
        residents: g.members.length,
        hasElderly,
        hasChildren,
        hasPregnant,
        hasDisabled,
        comorbidadeHas: countHAS > 0,
        comorbidadeDiabetes: countDM > 0,
        comorbidities: summaryParts.join(', '),
        householdMembers: g.members,
        titularName: g.members[0]?.name || '',
      }
    })

  return { houses, warnings }
}

export { parseHealthSheet, findHeaderRow, normalizeHeaderToken }
