const STATUS_COLORS = {
  danger: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', dot: 'bg-red-500' },
  warning: { bg: 'bg-amber-500/20', border: 'border-amber-500/40', text: 'text-amber-400', dot: 'bg-amber-500' },
  alert: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  attention: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', dot: 'bg-orange-500' },
  normal: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  unknown: { bg: 'bg-slate-500/20', border: 'border-slate-500/40', text: 'text-slate-400', dot: 'bg-slate-500' },
}

const STATUS_LABELS = {
  danger: 'Alagamento',
  warning: 'Alerta',
  alert: 'Atenção',
  attention: 'Observação',
  normal: 'Normal',
  unknown: 'Indisponível',
}

const TREND_ICONS = {
  rising: '↑',
  falling: '↓',
  stable: '→',
}

const GROUP_LABELS = {
  upstream: 'Montante (Jacuí)',
  local: 'São Jerônimo',
  downstream: 'Jusante (Guaíba)',
}

export default function StationCard({ data, group, floodWave }) {
  if (!data) return null
  const colors = STATUS_COLORS[data.status] || STATUS_COLORS.unknown
  const label = STATUS_LABELS[data.status] || STATUS_LABELS.unknown
  const trendIcon = TREND_ICONS[data.trend] || ''

  return (
    <div className={`relative overflow-hidden rounded-xl ${colors.bg} ${colors.border} border p-5 transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">{GROUP_LABELS[group] || group}</p>
          <h3 className="text-lg font-bold text-slate-100 mt-0.5">{data.station}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></span>
          <span className={`text-xs font-semibold ${colors.text}`}>{label}</span>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-bold text-slate-100 tracking-tight">
          {data.level != null ? data.level.toFixed(2) : '---'}
        </span>
        <span className="text-sm text-slate-400 font-medium">m</span>
        {data.trendRate > 0 && (
          <span className={`text-sm font-semibold ${data.trend === 'rising' ? 'text-red-400' : data.trend === 'falling' ? 'text-blue-400' : 'text-slate-400'} ml-1`}>
            {trendIcon} {data.trendRate.toFixed(1)} cm/h
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500">
        {data.floodThreshold != null && (
          <span>Cota inundação: <span className="text-slate-300 font-medium">{data.floodThreshold.toFixed(2)} m</span></span>
        )}
        {data.discharge != null && (
          <span>Vazão: <span className="text-slate-300 font-medium">{data.discharge.toFixed(0)} m³/s</span></span>
        )}
        {data.percentage > 0 && (
          <span className={data.percentage >= 80 ? 'text-red-400 font-semibold' : ''}>
            {data.percentage.toFixed(0)}%
          </span>
        )}
      </div>

      {data.source && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <span className="text-[10px] text-slate-600 font-mono">Fonte: {data.source}</span>
        </div>
      )}

      {floodWave && (
        <div className="mt-3 pt-3 border-t border-amber-500/20 bg-amber-500/10 -mx-5 -mb-5 px-5 py-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-400 font-semibold">🚨 Onda de cheia de {floodWave.from}</span>
            <span className="text-slate-400">→</span>
            <span className="text-slate-300">Chegada em <span className="text-amber-300 font-bold">{floodWave.arrivalWindow}</span></span>
          </div>
        </div>
      )}

      <div className="mt-4 h-2 bg-slate-800/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${data.percentage >= 80 ? 'bg-red-500' : data.percentage >= 57 ? 'bg-amber-500' : data.percentage >= 43 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
          style={{ width: `${Math.min(data.percentage || 0, 100)}%` }}
        />
      </div>
    </div>
  )
}
