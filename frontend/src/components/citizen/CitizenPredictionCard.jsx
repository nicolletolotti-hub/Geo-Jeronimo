import { calcTrendRate, calcPrediction } from '../../utils/prediction'

export default function CitizenPredictionCard({ river, stations, floodLevel }) {
  const trendRate = calcTrendRate(river, stations)
  const pred = (target) => calcPrediction(river.current, trendRate, target)

  if (!trendRate || river.trend !== 'rising') return null

  const warning = pred(river.warningLevel)
  const danger = pred(river.dangerLevel)
  const residence = pred(floodLevel)

  return (
    <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" aria-hidden="true">📈</span>
        <h3 className="font-bold text-slate-100">Previsão de Cheia</h3>
        <span className="text-xs text-slate-500 font-medium">Rio subindo +{trendRate.toFixed(1)} cm/h</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {warning && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-amber-500/20">
            <p className="text-xs text-amber-400 font-semibold mb-1">Nível de Alerta</p>
            <p className="text-lg font-bold text-slate-100">{warning.targetLevel.toFixed(1)}m</p>
            <p className="text-sm font-medium text-amber-400">em ~{warning.hoursLabel}</p>
          </div>
        )}
        {danger && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-red-500/20">
            <p className="text-xs text-red-400 font-semibold mb-1">Nível de Perigo</p>
            <p className="text-lg font-bold text-slate-100">{danger.targetLevel.toFixed(1)}m</p>
            <p className="text-sm font-medium text-red-400">em ~{danger.hoursLabel}</p>
          </div>
        )}
        {residence && (
          <div className="bg-slate-800/60 rounded-xl p-4 border border-primary-500/20">
            <p className="text-xs text-primary-400 font-semibold mb-1">Sua Residência</p>
            <p className="text-lg font-bold text-slate-100">{residence.targetLevel.toFixed(1)}m</p>
            <p className="text-sm font-medium text-primary-400">em ~{residence.hoursLabel}</p>
          </div>
        )}
      </div>
      <p className="text-xs text-slate-600 mt-3">
        * Previsão baseada na taxa de subida atual. Consulte a Defesa Civil para informações oficiais.
      </p>
    </div>
  )
}
