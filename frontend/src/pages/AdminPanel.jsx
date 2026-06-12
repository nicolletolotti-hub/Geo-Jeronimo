import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

export default function AdminPanel() {
  const { user, isAdmin, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/portal" replace />
  }

  if (!isAdmin()) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-8">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Acesso Negado</h1>
          <p className="text-slate-400 mb-6 text-lg">Você não tem permissão para acessar o painel administrativo.</p>
          <p className="text-sm text-slate-500">Apenas administradores podem acessar esta área.</p>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [residences, setResidences] = useState([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchResidences = async () => {
      try {
        const response = await api.get('/residence/all?limit=100')
        setResidences(response.data.residences)
        setPagination(response.data.pagination)
      } catch (err) {
        console.error('Erro ao buscar residências:', err)
        setError('Erro ao carregar dados. Verifique sua conexão.')
      } finally {
        setLoading(false)
      }
    }
    fetchResidences()
  }, [])

  const filteredResidences = residences.filter(res => {
    if (selectedFilter === 'all') return true
    if (selectedFilter === 'boat') return res.evacuation_logistics === 'boat'
    if (selectedFilter === 'comorbidities') return res.comorbidities && res.comorbidities.trim() !== ''
    if (selectedFilter === 'at_risk') return res.flood_level <= 5
    return true
  })

  const getLogisticsBadge = (logistics) => {
    switch (logistics) {
      case 'boat': return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">🚤 Barco</span>
      case 'truck': return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">🚚 Caminhão</span>
      case 'vehicle': return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">🚗 Veículo</span>
      default: return <span className="px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded-full">-</span>
    }
  }

  const getRiskBadge = (floodLevel) => {
    if (floodLevel <= 4) return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">Alto Risco</span>
    if (floodLevel <= 6) return <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">Médio Risco</span>
    return <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Baixo Risco</span>
  }

  const exportCSV = () => {
    const headers = ['Endereço', 'Bairro', 'Moradores', 'Logística', 'Comorbidades', 'Pets', 'Plano Abrigo', 'Nível Inundação', 'Latitude', 'Longitude', 'Usuário', 'Email']
    const rows = residences.map(r => [
      r.address, r.neighborhood, r.residents, r.evacuation_logistics,
      r.comorbidities || '', r.pets || '', r.shelter_plan, r.flood_level,
      r.latitude || '', r.longitude || '', r.name || '', r.email || ''
    ])
    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `geojeronimo_residencias_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(residences, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `geojeronimo_residencias_${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

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

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-8 text-center">
          <p className="text-red-400 text-lg font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100 mb-2 tracking-tight">Painel Administrativo</h1>
        <p className="text-slate-400 text-lg">Visão estratégica para otimização de resgate e assistência</p>
        {pagination && (
          <p className="text-xs text-slate-500 mt-1">Total: {pagination.total} residências cadastradas</p>
        )}
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-all duration-300">
          <div className="text-4xl font-bold text-primary-400">{residences.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">Residências Cadastradas</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-red-500/30 transition-all duration-300">
          <div className="text-4xl font-bold text-red-400">
            {residences.filter(r => r.evacuation_logistics === 'boat').length}
          </div>
          <div className="text-sm text-slate-400 font-medium mt-1">Precisam de Barco</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-amber-500/30 transition-all duration-300">
          <div className="text-4xl font-bold text-amber-400">
            {residences.filter(r => r.comorbidities && r.comorbidities.trim() !== '').length}
          </div>
          <div className="text-sm text-slate-400 font-medium mt-1">Comorbidades</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-emerald-500/30 transition-all duration-300">
          <div className="text-4xl font-bold text-emerald-400">
            {residences.filter(r => r.flood_level <= 5).length}
          </div>
          <div className="text-sm text-slate-400 font-medium mt-1">Alto Risco Imediato</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Filtros</h2>
        <div className="flex flex-wrap gap-3">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'boat', label: '🚤 Precisam de Barco' },
            { key: 'comorbidities', label: '🏥 Com Comorbidades' },
            { key: 'at_risk', label: '⚠️ Alto Risco' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setSelectedFilter(key)}
              className={`px-5 py-3 rounded-xl font-semibold transition-all duration-300 ${
                selectedFilter === key
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-slate-100">
            Residências Cadastradas ({filteredResidences.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Endereço</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bairro</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Moradores</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Logística</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Comorbidades</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Risco</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Usuário</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              {filteredResidences.map((residence) => (
                <tr key={residence.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-100">{residence.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{residence.neighborhood}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{residence.residents}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getLogisticsBadge(residence.evacuation_logistics)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {residence.comorbidities ? '✅ Sim' : '❌ Não'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getRiskBadge(residence.flood_level)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {residence.name || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredResidences.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg font-medium">Nenhuma residência encontrada</p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-2xl font-bold text-slate-100 mb-4">Exportar Dados</h2>
        <div className="flex flex-wrap gap-4">
          <button onClick={exportCSV}
            className="px-5 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-500 font-semibold transition-all duration-300 shadow-lg shadow-primary-600/20"
          >
            📄 Exportar CSV
          </button>
          <button onClick={exportJSON}
            className="px-5 py-3 bg-slate-700 text-slate-200 rounded-xl hover:bg-slate-600 font-semibold transition-all duration-300"
          >
            📊 Exportar JSON
          </button>
        </div>
      </div>
    </div>
  )
}
