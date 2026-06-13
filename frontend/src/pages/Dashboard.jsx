import { useState, useEffect } from 'react'
import RiverWeatherCard from '../components/Dashboard/RiverWeatherCard'
import RiverHistoryChart from '../components/Dashboard/RiverHistoryChart'
import RainfallHistory from '../components/Dashboard/RainfallHistory'
import AlertsFeed from '../components/Dashboard/AlertsFeed'
import HydrologicalPanel from '../components/Dashboard/HydrologicalPanel'
import WelcomeBanner from '../components/WelcomeBanner'
import api from '../services/api'

export default function Dashboard() {
  const [riverLevel, setRiverLevel] = useState(null)
  const [weather, setWeather] = useState(null)
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyPeriod, setHistoryPeriod] = useState(24)

  useEffect(() => {
    const loadData = async () => {
      try {
        const riverResponse = await api.get('/river/current')
        setRiverLevel(riverResponse.data)
      } catch (error) {
        console.error('Erro ao carregar nível do rio:', error)
      }

      try {
        const weatherResponse = await api.get('/weather/current')
        setWeather(weatherResponse.data)
      } catch (error) {
        console.error('Erro ao carregar clima:', error)
      }

      try {
        const alertsResponse = await api.get('/alerts/active')
        setAlerts(alertsResponse.data)
      } catch (error) {
        console.error('Erro ao carregar alertas:', error)
      }

      setLoading(false)
    }

    loadData()
    const interval = setInterval(loadData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyResponse = await api.get(`/river/history?hours=${historyPeriod}`)
        setHistory(historyResponse.data)
      } catch (error) {
        console.error('Erro ao carregar histórico:', error)
      }
    }
    loadHistory()
  }, [historyPeriod])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-slate-400">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <WelcomeBanner />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2 tracking-tight">Dashboard de Monitoramento</h1>
          <p className="text-slate-400 text-lg">Acompanhe em tempo real o nível do Rio Jacuí e condições climáticas</p>
        </div>
        {!riverLevel && !weather && (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-xl shadow-sm animate-pulse">
            <span className="text-amber-400 text-xl">⚠</span>
            <span className="text-amber-400 font-semibold text-sm">Alguns dados podem estar desatualizados</span>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-1 gap-8">
        <RiverWeatherCard riverData={riverLevel} weatherData={weather} />
      </div>

      <HydrologicalPanel />

      <RainfallHistory />

      <div className="bg-slate-900 rounded-2xl border border-primary-500/20 p-5 md:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-400"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">Estação DCRS093 — São Jerônimo</p>
              <p className="text-xs text-slate-500">Defesa Civil RS / Quallecontrol</p>
            </div>
          </div>
          <div className="flex-1 text-xs text-slate-400 leading-relaxed">
            Estação hidrometeorológica da Rede de Monitoramento do RS. Transmissão 4G/5G com redundância via satélite, dados atualizados a cada 10 segundos. Monitora o nível do Rio Jacuí em São Jerônimo.
          </div>
          <a
            href="https://dcrs.quallecontrol.com.br/Station/Details/DCRS093"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-400 rounded-xl text-sm font-medium transition-colors border border-primary-500/30 whitespace-nowrap"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Acessar Plataforma
          </a>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Histórico do Nível do Rio</h2>
          <div className="flex gap-2">
            {[
              { label: '1 Dia', hours: 24 },
              { label: '7 Dias', hours: 168 },
              { label: '20 Dias', hours: 480 }
            ].map((period) => (
              <button
                key={period.hours}
                onClick={() => setHistoryPeriod(period.hours)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  historyPeriod === period.hours
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                }`}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>
        <RiverHistoryChart data={history} />
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-slate-100">Central de Avisos</h2>
        <AlertsFeed alerts={alerts} statistics={alerts?.statistics} />
      </div>
    </div>
  )
}
