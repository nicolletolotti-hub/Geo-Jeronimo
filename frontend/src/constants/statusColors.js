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
