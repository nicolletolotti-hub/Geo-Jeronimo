const MUNICIPIO_BOUNDS = {
  minLat: -29.990,
  maxLat: -29.930,
  minLng: -51.760,
  maxLng: -51.690,
}

const BAIRROS_VALIDOS = [
  'Cidade Baixa', 'Centro', 'Bela Vista', 'Fátima', 'Quininho',
  'Cidade Alta', 'Capororóca', 'São Thomás', 'Princesa Isabel',
  "Passo D'Areia", 'Bandeira Branca', 'Parque de Exposições',
  'Padre Reus', 'São Francisco', 'Residencial Bela Vista',
  'Lago Parque Clube', 'Passo da Cruz', 'Porto do Conde',
]

export function validarCoordenadas(lat, lng) {
  if (lat == null || lng == null) return { valido: false, erro: 'Coordenadas obrigatórias' }
  if (typeof lat !== 'number' || typeof lng !== 'number') return { valido: false, erro: 'Coordenadas devem ser numéricas' }
  if (lat < MUNICIPIO_BOUNDS.minLat || lat > MUNICIPIO_BOUNDS.maxLat) return { valido: false, erro: `Latitude fora dos limites do município (${MUNICIPIO_BOUNDS.minLat} a ${MUNICIPIO_BOUNDS.maxLat})` }
  if (lng < MUNICIPIO_BOUNDS.minLng || lng > MUNICIPIO_BOUNDS.maxLng) return { valido: false, erro: `Longitude fora dos limites do município (${MUNICIPIO_BOUNDS.minLng} a ${MUNICIPIO_BOUNDS.maxLng})` }
  return { valido: true }
}

export function validarBairro(nome) {
  if (!nome) return { valido: false, erro: 'Bairro obrigatório' }
  const encontrado = BAIRROS_VALIDOS.find(b => b.toLowerCase() === nome.toLowerCase().trim())
  if (!encontrado) return { valido: false, erro: `Bairro "${nome}" não reconhecido. Válidos: ${BAIRROS_VALIDOS.join(', ')}` }
  return { valido: true, normalizado: encontrado }
}
