import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/mapa', label: 'Mapa de Inundação', icon: '🗺️' },
  { path: '/portal', label: 'Portal do Cidadão', icon: '👤' },
  { path: '/apoio', label: 'Apoio Psicológico', icon: '💙' },
]

export default function Layout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const location = useLocation()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
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

      <header className="bg-[#0d1b2a] border-b border-slate-800 shadow-xl sticky top-0 z-40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-3 hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-primary-500/20">
                G
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-100">GeoJeronimo</h1>
                <p className="text-xs text-slate-500 font-medium">Monitoramento de Cheias - São Jerônimo/RS</p>
              </div>
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-3 rounded-lg hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={isMenuOpen}
            >
              <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <nav className="hidden md:flex space-x-1" aria-label="Navegação principal">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
                    location.pathname === item.path
                      ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  <span className="mr-2" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <Link
                to="/admin"
                className={`px-4 py-2.5 rounded-xl font-medium transition-all duration-300 text-sm ${
                  location.pathname === '/admin'
                    ? 'bg-primary-500/15 text-primary-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
                aria-current={location.pathname === '/admin' ? 'page' : undefined}
              >
                <span className="mr-2">⚙️</span>
                Admin
              </Link>
            </nav>
          </div>

          {isMenuOpen && (
            <nav className="md:hidden mt-4 space-y-1 pb-2 border-t border-slate-800 pt-4" aria-label="Navegação móvel">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                    location.pathname === item.path
                      ? 'bg-primary-500/15 text-primary-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                  aria-current={location.pathname === item.path ? 'page' : undefined}
                >
                  <span className="mr-2" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-3 rounded-xl font-medium transition-all duration-300 ${
                  location.pathname === '/admin'
                    ? 'bg-primary-500/15 text-primary-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="mr-2">⚙️</span>
                Admin
              </Link>
            </nav>
          )}
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
                <li className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">199</span>
                  <span>Defesa Civil</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">193</span>
                  <span>Bombeiros</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">190</span>
                  <span>Polícia Militar</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400 font-bold">192</span>
                  <span>SAMU</span>
                </li>
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
