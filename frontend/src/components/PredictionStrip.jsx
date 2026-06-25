import React from 'react'

const TREND_ICONS = {
  up: '↑',
  down: '↓',
  stable: '→'
}

const STATUS_COLORS = {
  normal: 'text-emerald-400',
  atencao: 'text-amber-400',
  alerta: 'text-orange-400',
  perigo: 'text-red-400',
}

const STATUS_BG = {
  normal: 'bg-emerald-500/10 border-emerald-500/30',
  atencao: 'bg-amber-500/10 border-amber-500/30',
  alerta: 'bg-orange-500/10 border-orange-500/30',
  perigo: 'bg-red-500/10 border-red-500/30',
}

export default function PredictionStrip({ predictions, currentLevel }) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 text-sm">
        <span className="text-slate-400">Sem previsão disponível</span>
      </div>
    )
  }

  const mainPrediction = predictions[0]
  const trend = mainPrediction.trend || 'stable'
  const level = currentLevel || mainPrediction.currentLevel
  const nextLevel = mainPrediction.predictedLevel || (trend === 'up' ? level + 0.5 : trend === 'down' ? level - 0.5 : level)
  const status = nextLevel < 6 ? 'normal' : nextLevel < 9 ? 'atencao' : nextLevel < 12 ? 'alerta' : 'perigo'

  return (
    <div className={`flex items-center gap-4 px-4 py-2 rounded-lg border ${STATUS_BG[status]}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-300">Nível Atual</span>
        <span className={`text-lg font-bold ${STATUS_COLORS[status]}`}>
          {level?.toFixed(1)}m
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-slate-500">|</span>
        <span className="text-sm text-slate-400">
          {mainPrediction.trendLabel || (trend === 'up' ? 'subindo' : trend === 'down' ? 'descendo' : 'estável')}
        </span>
        <span className={`text-lg font-bold ${STATUS_COLORS[status]}`}>
          {TREND_ICONS[trend]}
        </span>
      </div>

      {nextLevel && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">|</span>
            <span className="text-sm text-slate-400">Previsto</span>
            <span className={`text-sm font-semibold ${STATUS_COLORS[status]}`}>
              {nextLevel.toFixed(1)}m
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">|</span>
            <span className="text-sm text-slate-400">
              {mainPrediction.arrivalWindow || 'Próximas 6h'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
