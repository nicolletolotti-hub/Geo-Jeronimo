import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

const levelConfig = {
  danger: { label: 'PERIGO', color: 'text-red-400', bg: 'bg-red-500', bar: 'bg-red-500', pulse: true },
  warning: { label: 'ALERTA', color: 'text-amber-400', bg: 'bg-amber-500', bar: 'bg-amber-500', pulse: false },
  normal: { label: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500', bar: 'bg-emerald-500', pulse: false },
}

const trendConfig = {
  rising: { icon: '↑', label: 'Subindo', color: 'text-red-400' },
  falling: { icon: '↓', label: 'Descendo', color: 'text-emerald-400' },
  stable: { icon: '→', label: 'Estável', color: 'text-slate-400' },
}

function weatherIcon(code) {
  const map = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️', '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '🌨️', '13n': '🌨️', '50d': '🌫️', '50n': '🌫️',
  }
  return map[code] || '🌤️'
}

export default function Dashboard() {
  const [river, setRiver] = useState(null)
  const [weather, setWeather] = useState(null)
  const [rainfall, setRainfall] = useState(null)
  const [riverHistory, setRiverHistory] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const [r, w, rf, rh] = await Promise.allSettled([
          api.get('/river/current'),
          api.get('/weather/current'),
          api.get('/rainfall/history'),
          api.get('/river/history?hours=1'),
        ])
        if (r.status === 'fulfilled') setRiver(r.value.data)
        if (w.status === 'fulfilled') setWeather(w.value.data)
        if (rf.status === 'fulfilled') setRainfall(rf.value.data)
        if (rh.status === 'fulfilled') setRiverHistory(rh.value.data)
      } catch {}
      setLoading(false)
    }
    fetch()
    const interval = setInterval(fetch, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    )
  }

  const status = river
    ? river.current >= river.dangerLevel ? 'danger'
      : river.current >= river.warningLevel ? 'warning' : 'normal'
    : 'normal'

  const lc = levelConfig[status]
  const trend = river ? trendConfig[river.trend] || trendConfig.stable : trendConfig.stable
  const percentage = river ? Math.min((river.current / 15) * 100, 100) : 0
  const weeklyRainfall = rainfall?.last7d?.value ?? rainfall?.last7d ?? null

  const riverChange = riverHistory?.length >= 2
    ? riverHistory[riverHistory.length - 1].level - riverHistory[0].level
    : null

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Hero */}
      <div className="text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-bold text-slate-100 tracking-tight leading-tight">
          Monitorando o <span className="text-primary-400">Rio Jacuí</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mt-2 max-w-2xl">
          Sistema de monitoramento e alerta de cheias para proteger a população de São Jerônimo - RS
        </p>
      </div>

      {/* River Gauge */}
      <div className={`relative overflow-hidden rounded-2xl border bg-slate-900 ${status === 'danger' ? 'border-red-500/40' : status === 'warning' ? 'border-amber-500/40' : 'border-slate-800'} shadow-xl transition-colors duration-700`}>
        {status === 'danger' && (
          <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none" />
        )}
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden="true">🌊</span>
              <div>
                <h2 className="text-lg font-bold text-slate-100">Nível do Rio Jacuí</h2>
                <p className="text-xs text-slate-500">Estação DCRS093 — São Jerônimo/RS</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full border text-sm font-bold ${
                status === 'danger' ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' :
                status === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {lc.label}
              </span>
            </div>
          </div>

          <div className="text-center mb-6">
            <span className="text-6xl md:text-7xl font-bold text-slate-100 tabular-nums">
              {river ? river.current.toFixed(2) : '---'}
            </span>
            <span className="text-2xl text-slate-500 ml-2 font-semibold">m</span>
          </div>

          <div className="space-y-2">
            <div className="relative h-5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className={`absolute left-0 top-0 h-full ${lc.bar} transition-all duration-1000 ease-out shadow-lg`}
                style={{ width: `${percentage}%` }}
              />
              {river && (
                <>
                  <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/80" style={{ left: `${(river.warningLevel / 15) * 100}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-red-400/80" style={{ left: `${(river.dangerLevel / 15) * 100}%` }} />
                </>
              )}
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>0m</span>
              {river && <span className="text-amber-400">{river.warningLevel.toFixed(1)}m</span>}
              {river && <span className="text-red-400">{river.dangerLevel.toFixed(1)}m</span>}
              <span>15m</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Tendência</p>
              <p className={`text-lg font-bold ${trend.color} flex items-center gap-1`}>
                {trend.icon} {trend.label}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Variação (1h)</p>
              <p className={`text-lg font-bold ${riverChange !== null && riverChange > 0 ? 'text-red-400' : riverChange !== null && riverChange < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                {riverChange !== null ? `${riverChange > 0 ? '+' : ''}${riverChange.toFixed(2)}m` : '—'}
              </p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Alerta</p>
              <p className="text-lg font-bold text-amber-400">{river ? `${river.warningLevel.toFixed(1)}m` : '—'}</p>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-500 mb-1">Perigo</p>
              <p className="text-lg font-bold text-red-400">{river ? `${river.dangerLevel.toFixed(1)}m` : '—'}</p>
            </div>
          </div>

          {river?.timestamp && (
            <p className="text-xs text-slate-600 mt-4">
              🕐 Atualizado: {new Date(river.timestamp).toLocaleTimeString('pt-BR')} — Dados em tempo real via Defesa Civil RS
            </p>
          )}
        </div>
      </div>

      {/* Weather + Rainfall */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {weather && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
            <p className="text-xs text-slate-500 mb-2">Clima Agora</p>
            <div className="flex items-center gap-3">
              <span className="text-3xl">{weatherIcon(weather.icon)}</span>
              <div>
                <span className="text-3xl font-bold text-slate-100">{weather.temp}°</span>
                {weather.feelsLike && <p className="text-xs text-slate-500">Sensação {weather.feelsLike}°</p>}
              </div>
            </div>
            <p className="text-sm text-slate-400 capitalize mt-2">{weather.condition}</p>
          </div>
        )}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
          <p className="text-xs text-slate-500 mb-2">Chuva Acumulada</p>
          <span className="text-3xl font-bold text-slate-100">
            {weeklyRainfall !== null ? `${typeof weeklyRainfall === 'object' ? weeklyRainfall.value ?? 0 : weeklyRainfall}` : '—'}
          </span>
          <span className="text-slate-500 ml-1 text-lg">mm</span>
          <p className="text-xs text-slate-500 mt-2">nos últimos 7 dias</p>
        </div>
        {weather && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-lg hover:border-slate-700 transition-colors">
            <p className="text-xs text-slate-500 mb-2">Umidade</p>
            <span className="text-3xl font-bold text-slate-100">{weather.humidity}</span>
            <span className="text-slate-500 ml-1 text-lg">%</span>
            <p className="text-xs text-slate-500 mt-2">Vento: {weather.windSpeed} km/h</p>
          </div>
        )}
      </div>

      {/* Action Cards */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 mb-4">Acesse os recursos</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/mapa"
            className="group bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-primary-500/40 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1"
          >
            <span className="text-3xl block mb-3" aria-hidden="true">🗺️</span>
            <h3 className="font-bold text-slate-100 group-hover:text-primary-400 transition-colors">Simular Inundação</h3>
            <p className="text-sm text-slate-500 mt-1">Visualize o impacto de diferentes níveis do rio</p>
          </Link>
          <Link to="/portal"
            className="group bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-primary-500/40 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1"
          >
            <span className="text-3xl block mb-3" aria-hidden="true">👤</span>
            <h3 className="font-bold text-slate-100 group-hover:text-primary-400 transition-colors">Portal do Cidadão</h3>
            <p className="text-sm text-slate-500 mt-1">Cadastre sua residência e receba alertas</p>
          </Link>
          <Link to="/apoio"
            className="group bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-primary-500/40 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1"
          >
            <span className="text-3xl block mb-3" aria-hidden="true">💙</span>
            <h3 className="font-bold text-slate-100 group-hover:text-primary-400 transition-colors">Apoio Psicológico</h3>
            <p className="text-sm text-slate-500 mt-1">Recursos de saúde mental e suporte emocional</p>
          </Link>
          <Link to="/admin"
            className="group bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg hover:border-primary-500/40 hover:bg-slate-800/80 transition-all duration-300 hover:-translate-y-1"
          >
            <span className="text-3xl block mb-3" aria-hidden="true">⚙️</span>
            <h3 className="font-bold text-slate-100 group-hover:text-primary-400 transition-colors">Painel do Servidor</h3>
            <p className="text-sm text-slate-500 mt-1">Gestão de residências e alertas (restrito)</p>
          </Link>
        </div>
      </div>

      {/* Quick Flood Check */}
      {river && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-100 mb-1">📋 Sua casa está em área de risco?</h2>
              <p className="text-sm text-slate-500">
                Acesse o <Link to="/portal" className="text-primary-400 hover:underline font-medium">Portal do Cidadão</Link>, cadastre sua residência no mapa e descubra automaticamente em qual nível do rio sua casa é afetada.
              </p>
            </div>
            <Link to="/portal"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-500/20 whitespace-nowrap"
            >
              👤 Cadastrar Residência
            </Link>
          </div>
        </div>
      )}

      {/* Emergency Bar */}
      <div className="bg-red-950/30 border border-red-900/40 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden="true">🆘</span>
            <div>
              <h2 className="text-lg font-bold text-red-300">Emergência</h2>
              <p className="text-sm text-red-400/80">Ligue imediatamente se estiver em perigo</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 md:ml-auto">
            {[
              { label: 'Defesa Civil', number: '199' },
              { label: 'Bombeiros', number: '193' },
              { label: 'SAMU', number: '192' },
              { label: 'Polícia', number: '190' },
            ].map((c) => (
              <a key={c.number} href={`tel:${c.number}`}
                className="flex items-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800/40 rounded-xl transition-colors group"
              >
                <span className="text-lg font-bold text-red-300 group-hover:text-red-200">{c.number}</span>
                <span className="text-xs text-red-400/70">{c.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
