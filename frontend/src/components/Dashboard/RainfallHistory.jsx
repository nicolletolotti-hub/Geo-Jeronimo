import { useState, useEffect } from 'react'
import api from '../../services/api'

const PERIODS = [
  { key: 'last24h', label: 'Hoje', tooltip: 'Últimas 24 horas' },
  { key: 'last7d', label: '7 Dias', tooltip: 'Últimos 7 dias' },
  { key: 'last20d', label: '20 Dias', tooltip: 'Últimos 20 dias' },
]

export default function RainfallHistory() {
  const [data, setData] = useState(null)
  const [activePeriod, setActivePeriod] = useState('last24h')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/rainfall/history')
        setData(res.data)
      } catch { }
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const getIntensity = (mm) => {
    if (mm == null) return { color: 'text-slate-500', bg: 'bg-slate-500/10', bar: 'w-0', label: 'Indisponível' }
    if (mm === 0) return { color: 'text-emerald-400', bg: 'bg-emerald-500/10', bar: 'w-0', label: 'Sem chuva' }
    if (mm < 5) return { color: 'text-blue-400', bg: 'bg-blue-500/10', bar: 'w-1/4', label: 'Chuva fraca' }
    if (mm < 25) return { color: 'text-amber-400', bg: 'bg-amber-500/10', bar: 'w-2/4', label: 'Chuva moderada' }
    if (mm < 50) return { color: 'text-orange-400', bg: 'bg-orange-500/10', bar: 'w-3/4', label: 'Chuva forte' }
    return { color: 'text-red-400', bg: 'bg-red-500/10', bar: 'w-full', label: 'Chuva intensa' }
  }

  const activeVal = data?.[activePeriod]
  const intensity = getIntensity(activeVal)

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-16 bg-slate-800 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Precipitação Acumulada</h2>
        </div>
        <div className="flex gap-2">
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => setActivePeriod(p.key)} title={p.tooltip}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                activePeriod === p.key
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${intensity.bg} rounded-xl border border-slate-700/50 p-6 transition-colors`}>
        <div className="flex items-baseline gap-3 mb-2">
          <span className={`text-5xl font-black tracking-tight ${intensity.color}`}>
            {activeVal != null ? activeVal.toFixed(1) : '---'}
          </span>
          <span className="text-2xl text-slate-400 font-medium">mm</span>
        </div>
        <p className={`text-sm font-medium ${intensity.color} mb-4`}>{intensity.label}</p>

        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${intensity.color.replace('text-', 'bg-')}`}
            style={{ width: activeVal != null ? `${Math.min((activeVal / 80) * 100, 100)}%` : '0%' }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0 mm</span>
          <span>40 mm</span>
          <span>80 mm</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {PERIODS.map(p => {
          const val = data?.[p.key]
          const col = getIntensity(val)
          return (
            <div key={p.key} className={`${col.bg} rounded-lg px-3 py-2 text-center border border-slate-700/30`}>
              <div className="text-xs text-slate-500">{p.label}</div>
              <div className={`text-lg font-bold ${col.color}`}>{val != null ? val.toFixed(1) : '---'} <span className="text-xs font-normal text-slate-500">mm</span></div>
            </div>
          )
        })}
      </div>

      {data?.source && (
        <p className="text-xs text-slate-600 mt-4 text-center">Fonte: {data.source}</p>
      )}
    </div>
  )
}
