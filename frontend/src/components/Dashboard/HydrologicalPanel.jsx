import { useState, useEffect, useCallback } from 'react'
import StationCard from './StationCard'
import api from '../../services/api'

export default function HydrologicalPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const response = await api.get('/stations')
      setData(response.data)
      setError(null)
    } catch (err) {
      setError('Falha ao carregar dados das estações')
      console.error('Station load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadData])

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="h-32 bg-slate-800 rounded-xl"></div>
            <div className="h-32 bg-slate-800 rounded-xl"></div>
            <div className="h-32 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-3 text-red-400">
          <span className="text-xl">⚠</span>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (!data?.stations) return null

  const { stations, prediction } = data
  const allStations = [
    ...(stations?.upstream?.map(s => ({ ...s, _group: 'upstream' })) || []),
    ...(stations?.local?.map(s => ({ ...s, _group: 'local' })) || []),
    ...(stations?.downstream?.map(s => ({ ...s, _group: 'downstream' })) || []),
  ]

  const hasAnyData = allStations.some(s => s.level != null)
  if (!hasAnyData && error) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
        <div className="text-center py-8">
          <p className="text-slate-500 mb-2">Dados hidrológicos indisponíveis no momento</p>
          <p className="text-xs text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  const localLevel = stations?.local?.[0]?.level
  const dangerLevel = localLevel >= 7
  const warningLevel = localLevel >= 5.5

  return (
    <div className={`bg-slate-900 rounded-2xl border ${dangerLevel ? 'border-red-500/40' : warningLevel ? 'border-amber-500/40' : 'border-slate-800'} p-6 md:p-8 shadow-lg transition-colors`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-2xl font-bold text-slate-100">Monitoramento Hidrológico</h2>
          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-mono font-bold">DCRS093</span>
          {dangerLevel && (
            <span className="px-3 py-1 bg-red-500/20 border border-red-500/40 rounded-full text-red-400 text-xs font-bold animate-pulse">
              ALAGAMENTO
            </span>
          )}
          {warningLevel && !dangerLevel && (
            <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-400 text-xs font-bold">
              ALERTA
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            Atualizado: {new Date(data.timestamp).toLocaleTimeString('pt-BR')}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            {expanded ? 'Resumir' : 'Detalhes'}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {allStations.map((station) => {
          const wave = prediction?.predictions?.find(p => p.from === station.station)
          return (
            <StationCard
              key={station.station}
              data={station}
              group={station._group}
              floodWave={wave}
            />
          )
        })}
      </div>

      {prediction && expanded && (
        <div className="mt-6 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Previsão de Onda de Cheia</h3>

          {dangerLevel || warningLevel ? (
            <div className={`p-4 rounded-xl mb-4 ${dangerLevel ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
              <p className={`font-bold ${dangerLevel ? 'text-red-400' : 'text-amber-400'}`}>
                Nível do Rio Jacuí em São Jerônimo atingiu {localLevel?.toFixed(2)}m
                {dangerLevel ? ' — RISCO DE ALAGAMENTO' : ' — NÍVEL DE ALERTA'}
              </p>
            </div>
          ) : null}

          <div className="space-y-3">
            {prediction.predictions?.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div className="flex items-center gap-4">
                  <div className="w-2 h-10 rounded-full bg-primary-500"></div>
                  <div>
                    <p className="font-semibold text-slate-200">{p.from}</p>
                    <p className="text-xs text-slate-500">Nível atual: {p.currentLevel?.toFixed(2)}m | {p.trendRate?.toFixed(1)} cm/h ({p.trend})</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-primary-400">{p.predictedLevel?.toFixed(2)}m</p>
                  <p className="text-xs text-slate-500">Previsto em {p.arrivalWindow}</p>
                </div>
              </div>
            ))}
          </div>

          {prediction.highestPredictedLevel && (
            <div className="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Nível máximo previsto em São Jerônimo:</span>
                <span className={`text-2xl font-bold ${prediction.highestPredictedLevel >= 7 ? 'text-red-400' : prediction.highestPredictedLevel >= 5.5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {prediction.highestPredictedLevel.toFixed(2)}m
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{prediction.note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
