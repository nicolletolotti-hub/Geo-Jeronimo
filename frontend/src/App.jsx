import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'

const FloodMap = lazy(() => import('./pages/FloodMap'))
const CitizenPortal = lazy(() => import('./pages/CitizenPortal'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

function NotFound() {
  return (
    <div className="max-w-md mx-auto text-center py-20">
      <div className="text-6xl font-black text-slate-700 mb-4">404</div>
      <h1 className="text-2xl font-bold text-slate-100 mb-2">Página não encontrada</h1>
      <p className="text-slate-400 mb-8">A página que você procura não existe ou foi movida.</p>
      <Link to="/mapa" className="inline-flex px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 font-semibold transition-all">
        Ir para o Mapa de Inundação
      </Link>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]" role="status">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" aria-hidden="true"></div>
        <p className="text-slate-400">Carregando...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/mapa" replace />} />
              <Route path="mapa" element={<FloodMap />} />
              <Route path="portal" element={<CitizenPortal />} />
              <Route path="admin" element={<AdminPanel />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App
