export const RIVER_STATUS = {
  normal: { label: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/40' },
  attention: { label: 'Atenção', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/40' },
  warning: { label: 'Alerta', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/40' },
  danger: { label: 'Perigo', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' },
}

export const FLOOD_RISK = {
  LOW: { label: 'BAIXO RISCO', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500' },
  ATTENTION: { label: 'ATENÇÃO', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500' },
  ALERT: { label: 'ALERTA', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500' },
  DANGER: { label: 'PERIGO', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500' },
}

export const EVAC_STATUS = {
  unknown: { label: 'Desconhecido', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  not_rescued: { label: 'Aguardando Resgate', color: 'text-red-400', bg: 'bg-red-500/20' },
  evacuated: { label: 'Evacuado', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  in_shelter: { label: 'Em Abrigo', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  with_family: { label: 'Com Familiares', color: 'text-purple-400', bg: 'bg-purple-500/20' },
}

export const ALERT_STYLES = {
  'CRÍTICO': { bg: 'bg-red-500/15', text: 'text-red-400', border: 'border-red-500/30' },
  'ALERTA': { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30' },
  'ATENÇÃO': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
  'NORMAL': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
}

export const getFloodRisk = (level) => {
  if (level < 6) return FLOOD_RISK.LOW
  if (level < 9) return FLOOD_RISK.ATTENTION
  if (level < 12) return FLOOD_RISK.ALERT
  return FLOOD_RISK.DANGER
}

export const NEIGHBORHOOD_RISK = {
  'Cidade Baixa': { alert: 'ATENÇÃO', floodedStreets: 8 },
  'Centro': { alert: 'ALERTA', floodedStreets: 12 },
  'Bela Vista': { alert: 'ATENÇÃO', floodedStreets: 5 },
  'Fátima': { alert: 'CRÍTICO', floodedStreets: 15 },
  'Quininho': { alert: 'ALERTA', floodedStreets: 10 },
  'Cidade Alta': { alert: 'NORMAL', floodedStreets: 2 },
  'Capororóca': { alert: 'ATENÇÃO', floodedStreets: 6 },
  'São Thomás': { alert: 'NORMAL', floodedStreets: 1 },
  'Princesa Isabel': { alert: 'NORMAL', floodedStreets: 0 },
  'Passo D\'Areia': { alert: 'ATENÇÃO', floodedStreets: 4 },
  'Bandeira Branca': { alert: 'CRÍTICO', floodedStreets: 20 },
  'Parque de Exposições': { alert: 'NORMAL', floodedStreets: 0 },
  'Padre Reus': { alert: 'NORMAL', floodedStreets: 0 },
  'São Francisco': { alert: 'NORMAL', floodedStreets: 0 },
  'Residencial Bela Vista': { alert: 'NORMAL', floodedStreets: 0 },
  'Lago Parque Clube': { alert: 'NORMAL', floodedStreets: 0 },
  'Passo da Cruz': { alert: 'ATENÇÃO', floodedStreets: 3 },
  'Porto do Conde': { alert: 'CRÍTICO', floodedStreets: 18 },
}

export const RUAS_ALAGADAS = {
  'Cidade Baixa': ['Cel. Augusto Pereira', 'Dr. Roque', 'João XXIII', '7 de Setembro', '1° de Maio', 'das Acácias', 'dos Andradas', 'Amazonas'],
  'Centro': ['Cel. Joaquim Pedro', 'Dr. Dinis', '15 de Novembro', '20 de Setembro', 'do Comércio', 'dos Ferroviários', 'Júlio de Castilhos', 'Setembrino', 'Venâncio Aires', 'Pinheiro Machado', 'Ceará', 'São Paulo'],
  'Fátima': ['Rua 1', 'Rua 2', 'Rua 3', 'Av. B', 'Rua 5', 'Rua 6', 'Rua 7', 'Rua 8', 'Rua 9', 'Rua 10', 'Rua 11', 'Rua 12', 'Rua 13', 'Rua 14', 'Rua 15'],
  'Quininho': ['Rua A', 'Rua B', 'Rua C', 'Rua D', 'Rua E', 'da Amizade', 'do Sol', 'das Flores', 'dos Pássaros', 'Verde'],
  'Bandeira Branca': ['Principal', 'Av. Central', 'Rua 1', 'Rua 2', 'Rua 3', 'Rua 4', 'Rua 5', 'Rua 6', 'Rua 7', 'Rua 8', 'Rua 9', 'Rua 10', 'Rua 11', 'Rua 12', 'Rua 13', 'Rua 14', 'Rua 15', 'Rua 16', 'Rua 17', 'Rua 18'],
  'Porto do Conde': ['Estrada Porto do Conde', 'Principal', 'do Porto', 'da Praia', 'do Lago', 'Rua 1', 'Rua 2', 'Rua 3', 'Rua 4', 'Rua 5', 'Rua 6', 'Rua 7', 'Rua 8', 'Rua 9', 'Rua 10', 'Rua 11', 'Rua 12', 'Rua 13'],
  'Passo da Cruz': ['da Figueira', 'do Santuário', 'das Pedras'],
  'Capororóca': ['Capororoca', 'do Campo', 'da Serra', 'da Várzea', 'do Riacho', 'da Lagoa'],
  'Cidade Alta': ['do Alto', 'do Mirante'],
  'Passo D\'Areia': ['Estrada Passo D\'Areia', 'do Areal', 'do Meio', 'da Fonte'],
  'Bela Vista': ['Bela Vista', 'do Morro', 'da Paz', 'da Serra', 'do Vale'],
}
