import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/Layout'
import { AuthProvider } from './contexts/AuthContext'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const FloodMap = lazy(() => import('./pages/FloodMap'))
const CitizenPortal = lazy(() => import('./pages/CitizenPortal'))
const PsychologicalSupport = lazy(() => import('./pages/PsychologicalSupport'))
const AdminPanel = lazy(() => import('./pages/AdminPanel'))

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
              <Route index element={<Dashboard />} />
              <Route path="mapa" element={<FloodMap />} />
              <Route path="portal" element={<CitizenPortal />} />
              <Route path="apoio" element={<PsychologicalSupport />} />
              <Route path="admin" element={<AdminPanel />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App
