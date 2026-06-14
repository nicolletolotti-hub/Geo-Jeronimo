import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../services/api'

const navItems = [
  { path: '/', label: 'Início', icon: '🏠' },
  { path: '/mapa', label: 'Mapa de Inundação', icon: '🗺️' },
  { path: '/portal', label: 'Painel do Usuário', icon: '👤' },
]

const trendConfig = {
  rising: { icon: '↑', label: 'Subindo', color: 'text-red-400' },
  falling: { icon: '↓', label: 'Descendo', color: 'text-emerald-400' },
  stable: { icon: '→', label: 'Estável', color: 'text-slate-400' },
}

function RiverBadge({ level, warningLevel, dangerLevel }) {
  const status = level >= dangerLevel ? 'danger'
    : level >= warningLevel ? 'warning' : 'normal'
  const config = {
    danger: { label: 'PERIGO', class: 'bg-red-500/20 text-red-300 border-red-500/40' },
    warning: { label: 'ALERTA', class: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    normal: { label: 'Normal', class: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  }
  const s = config[status]
  return (
    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold whitespace-nowrap ${s.class}`}>
      {s.label}
    </span>
  )
}

function weatherIcon(code) {
  const map = {
    '01d': '☀️', '01n': '🌙', '02d': '⛅', '02n': '☁️', '03d': '☁️', '03n': '☁️',
    '04d': '☁️', '04n': '☁️', '09d': '🌧️', '09n': '🌧️', '10d': '🌦️', '10n': '🌧️',
    '11d': '⛈️', '11n': '⛈️', '13d': '🌨️', '13n': '🌨️', '50d': '🌫️', '50n': '🌫️',
  }
  return map[code] || '🌤️'
}

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [river, setRiver] = useState(null)
  const [weather, setWeather] = useState(null)
  const [rainfall, setRainfall] = useState(null)
  const location = useLocation()

  useEffect(() => {
    const h = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', h); window.addEventListener('offline', h)
    return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h) }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [r, w, rf] = await Promise.allSettled([
          api.get('/river/current'),
          api.get('/weather/current'),
          api.get('/rainfall/history'),
        ])
        if (r.status === 'fulfilled') setRiver(r.value.data)
        if (w.status === 'fulfilled') setWeather(w.value.data)
        if (rf.status === 'fulfilled') setRainfall(rf.value.data)
      } catch {}
    }
    fetchData()
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const riverStatus = river
    ? river.current >= river.dangerLevel ? 'danger'
      : river.current >= river.warningLevel ? 'warning' : 'normal'
    : 'normal'

  const ribbonBg = {
    danger: 'bg-gradient-to-r from-red-900/90 via-red-800/80 to-red-900/90',
    warning: 'bg-gradient-to-r from-amber-900/90 via-amber-800/80 to-amber-900/90',
    normal: 'bg-gradient-to-r from-slate-800/90 via-primary-900/70 to-slate-800/90',
  }[riverStatus]

  const trend = river ? trendConfig[river.trend] || trendConfig.stable : trendConfig.stable
  const weeklyRainfall = rainfall?.last7d?.value ?? rainfall?.last7d ?? null

  return (
    <div className="min-h-screen flex flex-col bg-[#0b1120]">
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo principal
      </a>

      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-600 text-white text-center py-3 text-sm font-medium z-50 shadow-lg animate-pulse" role="alert">
          ⚠️ Você está offline. Algumas funcionalidades podem estar limitadas.
        </div>
      )}

      <header className="sticky top-0 z-40">
        <div className={`${ribbonBg} border-b border-white/5 transition-all duration-700`}>
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4 text-xs md:text-sm overflow-x-auto">
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              <span className="text-lg" aria-hidden="true">🌊</span>
              {river ? (
                <>
                  <span className="font-bold text-slate-100 text-lg md:text-xl tabular-nums">{river.current.toFixed(2)}</span>
                  <span className="text-slate-400">m</span>
                  <span className={`font-semibold ${trend.color} flex items-center gap-0.5`}>
                    {trend.icon} {trend.label}
                  </span>
                  <RiverBadge level={river.current} warningLevel={river.warningLevel} dangerLevel={river.dangerLevel} />
                </>
              ) : (
                <span className="text-slate-500">Carregando nível do rio...</span>
              )}
            </div>
            <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
              {weather && (
                <span className="flex items-center gap-1.5 text-slate-300 whitespace-nowrap">
                  <span>{weatherIcon(weather.icon)}</span>
                  <span className="font-semibold">{weather.temp}°C</span>
                  {weather.condition && (
                    <span className="hidden sm:inline text-slate-500 capitalize">{weather.condition}</span>
                  )}
                </span>
              )}
              {weeklyRainfall !== null && (
                <span className="flex items-center gap-1 text-slate-300 whitespace-nowrap">
                  <span>🌧️</span>
                  <span className="font-semibold">{typeof weeklyRainfall === 'object' ? weeklyRainfall.value ?? 0 : weeklyRainfall}mm</span>
                  <span className="hidden sm:inline text-slate-500">/semana</span>
                </span>
              )}
              {river?.timestamp && (
                <span className="hidden lg:inline text-slate-600 text-[10px] whitespace-nowrap">
                  {new Date(river.timestamp).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="bg-[#0d1b2a]/95 backdrop-blur-sm border-b border-slate-800 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-base shadow-lg shadow-primary-500/20">
                  G
                </div>
                <div className="leading-tight">
                  <h1 className="text-lg font-bold tracking-tight text-slate-100">GeoJeronimo</h1>
                  <p className="text-[10px] text-slate-500 font-medium hidden sm:block">Monitoramento de Cheias - São Jerônimo/RS</p>
                </div>
              </Link>

              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2.5 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
                aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={isMenuOpen}
              >
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <nav className="hidden md:flex items-center space-x-0.5" aria-label="Navegação principal">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3.5 py-2 rounded-xl font-medium transition-all duration-300 text-sm ${
                      location.pathname === item.path
                        ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                  >
                    <span className="mr-1.5" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
                <Link
                  to="/admin"
                  className={`px-3.5 py-2 rounded-xl font-medium transition-all duration-300 text-sm ${
                    location.pathname === '/admin'
                      ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                  aria-current={location.pathname === '/admin' ? 'page' : undefined}
                >
                  <span className="mr-1.5">⚙️</span>
                  Painel do Servidor
                </Link>
              </nav>
            </div>

            {isMenuOpen && (
              <nav className="md:hidden mt-3 space-y-0.5 pb-1 border-t border-slate-800 pt-3" aria-label="Navegação móvel">
                {[...navItems, { path: '/admin', label: 'Painel do Servidor', icon: '⚙️' }].map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                      location.pathname === item.path
                        ? 'bg-primary-500/15 text-primary-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                    aria-current={location.pathname === item.path ? 'page' : undefined}
                  >
                    <span className="mr-2" aria-hidden="true">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 px-4 py-6 md:px-6 md:py-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>

      <footer className="bg-[#0d1b2a] border-t border-slate-800">
        <div className="px-4 py-8 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-bold mb-3 text-lg flex items-center gap-2 text-slate-100">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">G</div>
                GeoJeronimo
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Sistema de monitoramento e alerta de cheias para São Jerônimo - RS, desenvolvido para proteger vidas e propriedades.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-lg text-slate-100">📞 Contatos de Emergência</h3>
              <ul className="text-sm text-slate-500 space-y-2">
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold">199</span><span>Defesa Civil</span></li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold">193</span><span>Bombeiros</span></li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold">190</span><span>Polícia Militar</span></li>
                <li className="flex items-center gap-2"><span className="text-red-400 font-bold">192</span><span>SAMU</span></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-3 text-lg text-slate-100">ℹ️ Sobre</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Projeto desenvolvido para auxiliar a população de São Jerônimo em situações de emergência climática, fornecendo informações em tempo real sobre o nível do Rio Jacuí.
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-6 text-center text-sm text-slate-600">
            <p>© {new Date().getFullYear()} GeoJeronimo - Todos os direitos reservados</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
