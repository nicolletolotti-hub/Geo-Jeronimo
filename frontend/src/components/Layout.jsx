import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import api from '../services/api'
import { startNotificationService, stopNotificationService } from '../services/notificationService'
import InstallPwa from './InstallPwa'
import { navItems } from '../constants/navItems'

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const location = useLocation()

  useEffect(() => {
    const h = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', h); window.addEventListener('offline', h)
    return () => { window.removeEventListener('online', h); window.removeEventListener('offline', h) }
  }, [])

  useEffect(() => {
    startNotificationService(api)
    return () => stopNotificationService()
  }, [])

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
                <InstallPwa />
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
        <div className="px-4 py-3 max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-600">
          <span>© {new Date().getFullYear()} GeoJeronimo</span>
          <span>São Jerônimo - RS</span>
        </div>
      </footer>
    </div>
  )
}
