import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { LoginFormSchema, validateForm } from '../utils/validation'
import LocationPicker from '../components/LocationPicker'

const TABS = [
  { key: 'impacto', label: 'Impacto por Nível' },
  { key: 'defesa_civil', label: 'Defesa Civil' },
  { key: 'saude', label: 'Saúde' },
  { key: 'assistencia', label: 'Assistência Social' },
  { key: 'agente', label: 'Agente' },
]

const ADMIN_TABS = [
  { key: 'agentes_pendentes', label: 'Agentes Pendentes' },
  { key: 'importar', label: 'Importar Excel' },
]

const EVAC_STATUS = {
  unknown: { label: 'Desconhecido', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  not_rescued: { label: 'Aguardando Resgate', color: 'text-red-400', bg: 'bg-red-500/20' },
  evacuated: { label: 'Evacuado', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  in_shelter: { label: 'Em Abrigo', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  with_family: { label: 'Com Familiares', color: 'text-purple-400', bg: 'bg-purple-500/20' },
}

import { calcTrendRate, calcPrediction } from '../utils/prediction'

function AdminLoginForm() {
  const { login } = useAuth()
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    const validation = validateForm(LoginFormSchema, formData)
    if (!validation.valid) { setErrors(validation.errors); return }
    setLoading(true)
    try {
      const response = await api.post('/auth/login', validation.data)
      login(response.data.user, response.data.token, response.data.refreshToken)
    } catch (error) {
      setApiError(error.response?.data?.error || 'Erro ao fazer login')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto mt-8">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">Painel do Servidor</h1>
        <p className="text-slate-400 mb-8">Acesso restrito a administradores e agentes municipais.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {apiError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl" role="alert">
              {apiError}
            </div>
          )}
          <div>
            <label htmlFor="admin-email" className="block text-sm font-semibold text-slate-300 mb-2">Email</label>
            <input id="admin-email" name="email" type="email" value={formData.email} onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
                errors.email ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            {errors.email && <p className="text-red-400 text-sm mt-1 font-medium">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="admin-password" className="block text-sm font-semibold text-slate-300 mb-2">Senha</label>
            <input id="admin-password" name="password" type="password" value={formData.password} onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 ${
                errors.password ? 'border-red-500/50 bg-red-500/10' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            {errors.password && <p className="text-red-400 text-sm mt-1 font-medium">{errors.password}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-primary-600 text-white py-3 px-4 rounded-xl hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all duration-300 shadow-lg shadow-primary-600/20"
          >
            {loading ? 'Carregando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const { user, isAuthenticated, isAgent } = useAuth()

  if (!isAuthenticated) {
    return <AdminLoginForm />
  }

  if (user?.agentStatus === 'pending' && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <span className="text-5xl block mb-4">⏳</span>
          <h1 className="text-2xl font-bold text-amber-400 mb-3">Cadastro Pendente</h1>
          <p className="text-slate-300 text-lg mb-2">Seu cadastro como agente ainda não foi aprovado.</p>
          <p className="text-slate-400">Aguarde a validação do administrador para acessar o sistema. Você receberá acesso assim que for aprovado.</p>
        </div>
      </div>
    )
  }

  if (!isAgent()) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-8">
          <h1 className="text-3xl font-bold mb-4 text-red-400">Acesso Negado</h1>
          <p className="text-slate-400 mb-6 text-lg">Você não tem permissão para acessar esta área.</p>
          <p className="text-sm text-slate-500">Apenas administradores e agentes municipais podem acessar.</p>
        </div>
      </div>
    )
  }

  return <AdminDashboard user={user} />
}

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('geral')
  const [residences, setResidences] = useState([])
  const [river, setRiver] = useState(null)
  const [stations, setStations] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [res, rv, st] = await Promise.allSettled([
          api.get('/residence/all?limit=500'),
          api.get('/river/current'),
          api.get('/stations'),
        ])
        if (res.status === 'fulfilled') setResidences(res.value.data.residences)
        if (rv.status === 'fulfilled') setRiver(rv.value.data)
        if (st.status === 'fulfilled') setStations(st.value.data)
      } catch (err) {
        setError('Erro ao carregar dados.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-slate-400">Carregando dados...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight">Painel Municipal</h1>
      <p className="text-slate-400 text-lg -mt-4">
        {user?.role === 'agent' ? 'Agente Municipal' : user?.role === 'admin' ? 'Administrador' : 'Super Administrador'}
      </p>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {(() => {
          const agentAreaTabs = TABS.filter(t => {
            if (user?.role === 'admin' || user?.role === 'superadmin') return true
            if (t.key === 'impacto' || t.key === 'agente') return true
            return t.key === user?.agentArea
          })
          const adminTabs = (user?.role === 'admin' || user?.role === 'superadmin') ? ADMIN_TABS : []
          return [...agentAreaTabs, ...adminTabs];
        })().map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.key ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'impacto' && <ImpactoTab residences={residences} river={river} stations={stations} />}
      {activeTab === 'defesa_civil' && <DefesaCivilTab residences={residences} />}
      {activeTab === 'saude' && <SaudeTab residences={residences} />}
      {activeTab === 'assistencia' && <AssistenciaTab residences={residences} />}
      {activeTab === 'agente' && <AgenteTab />}
      {activeTab === 'agentes_pendentes' && <AgentesPendentesTab />}
      {activeTab === 'importar' && <ImportarTab />}
    </div>
  )
}


function ImpactoTab({ residences, river, stations }) {
  const [level, setLevel] = useState(5)
  const [expandMatrix, setExpandMatrix] = useState(false)

  const levels = Array.from({ length: 15 }, (_, i) => i + 1)

  const matrix = levels.map(l => {
    const affected = residences.filter(r => r.flood_level <= l)
    const byBairro = {}
    affected.forEach(r => {
      byBairro[r.neighborhood] = (byBairro[r.neighborhood] || 0) + 1
    })
    return { level: l, total: affected.length, bairros: Object.entries(byBairro).sort((a, b) => b[1] - a[1]) }
  })

  const current = matrix.find(m => m.level === level)
  const filtered = residences.filter(r => r.flood_level <= level)

  const getBarWidth = (count) => {
    const maxCount = Math.max(...matrix.map(m => m.total), 1)
    return (count / maxCount) * 100
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">
            Impacto por Nível do Rio
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Nível:</span>
            <span className="text-3xl font-black text-primary-400">{level}m</span>
          </div>
        </div>

        <input type="range" min="1" max="15" step="1" value={level} onChange={e => setLevel(parseInt(e.target.value))}
          className="w-full h-2 bg-gradient-to-r from-emerald-500 via-amber-500 via-orange-500 to-red-500 rounded-full appearance-none cursor-pointer accent-primary-400 mb-4" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">Residências Afetadas</p>
            <p className="text-3xl font-bold text-red-400">{current?.total || 0}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">Bairros Atingidos</p>
            <p className="text-3xl font-bold text-amber-400">{current?.bairros.length || 0}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">Moradores</p>
            <p className="text-3xl font-bold text-sky-400">{filtered.reduce((s, r) => s + r.residents, 0)}</p>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
            <p className="text-xs text-slate-400 font-semibold mb-1">Precisa Barco</p>
            <p className="text-3xl font-bold text-purple-400">{filtered.filter(r => r.evacuation_logistics === 'boat').length}</p>
          </div>
        </div>

        {current && current.bairros.length > 0 && (
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
            <h3 className="text-sm font-bold text-slate-300 mb-3">Atingidos por Bairro</h3>
            <div className="space-y-2">
              {current.bairros.map(([bairro, count]) => (
                <div key={bairro} className="flex items-center gap-3">
                  <span className="text-sm text-slate-300 w-40 truncate">{bairro}</span>
                  <div className="flex-1 bg-slate-700/50 rounded-full h-4 overflow-hidden">
                    <div className="bg-primary-500/60 h-full rounded-full transition-all duration-500" style={{ width: `${(count / Math.max(...current.bairros.map(b => b[1]))) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-slate-200 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100">Visão Geral por Nível</h2>
          <button onClick={() => setExpandMatrix(!expandMatrix)} className="text-xs text-primary-400 hover:text-primary-300 font-medium">
            {expandMatrix ? 'Recolher' : 'Expandir'}
          </button>
        </div>
        {expandMatrix && (
          <div className="overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase">
                  <th className="px-3 py-2">Nível</th>
                  <th className="px-3 py-2">Residências</th>
                  <th className="px-3 py-2">Moradores</th>
                  <th className="px-3 py-2">Bairros</th>
                  <th className="px-3 py-2">Barra</th>
                  <th className="px-3 py-2">Precisa Barco</th>
                  <th className="px-3 py-2">Vulneráveis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {matrix.map(m => {
                  const atLevel = residences.filter(r => r.flood_level <= m.level)
                  const vulneraveis = atLevel.filter(r => r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled)
                  return (
                    <tr key={m.level} className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${m.level === level ? 'bg-primary-500/10' : ''}`} onClick={() => setLevel(m.level)}>
                      <td className={`px-3 py-2 font-bold ${m.level >= 10 ? 'text-red-400' : m.level >= 6 ? 'text-amber-400' : 'text-emerald-400'}`}>{m.level}m</td>
                      <td className="px-3 py-2 font-semibold text-slate-200">{m.total}</td>
                      <td className="px-3 py-2 text-slate-300">{atLevel.reduce((s, r) => s + r.residents, 0)}</td>
                      <td className="px-3 py-2 text-slate-300">{m.bairros.length}</td>
                      <td className="px-3 py-2">
                        <div className="w-32 bg-slate-700/50 rounded-full h-3 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${m.level >= 10 ? 'bg-red-500' : m.level >= 6 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${getBarWidth(m.total)}%` }} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-slate-300">{atLevel.filter(r => r.evacuation_logistics === 'boat').length}</td>
                      <td className="px-3 py-2 text-amber-400">{vulneraveis.length}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-100">Residências Afetadas em {level}m ({filtered.length})</h2>
        </div>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Moradores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Inunda em</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Logística</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Vulneráveis</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.sort((a, b) => a.flood_level - b.flood_level).map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.residents}</td>
                  <td className="px-4 py-3 text-sm font-bold text-red-400">{r.flood_level}m</td>
                  <td className="px-4 py-3 text-sm">{r.evacuation_logistics === 'boat' ? '🚤 Barco' : r.evacuation_logistics === 'truck' ? '🚚 Caminhão' : '🚗 Veículo'}</td>
                  <td className="px-4 py-3 text-sm">
                    {[r.has_elderly && '👴', r.has_children && '👶', r.has_pregnant && '🤰', r.has_disabled && '♿'].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.telefone_contato || r.telefone_emergencia || '—'}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="7" className="text-center py-8 text-slate-500">Nenhuma residência afetada neste nível</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function DefesaCivilTab({ residences }) {
  const needsBoat = residences.filter(r => r.evacuation_logistics === 'boat')
  const notRescued = residences.filter(r => r.evacuation_status === 'not_rescued')
  const highRisk = residences.filter(r => r.flood_level <= 5)

  const priority = [...notRescued, ...highRisk.filter(r => r.evacuation_status !== 'not_rescued')]
    .filter((r, i, self) => self.findIndex(s => s.id === r.id) === i)
    .slice(0, 50)

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-6">
          <div className="text-3xl font-bold text-red-400">{notRescued.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🔴 Aguardando Resgate</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-amber-500/30 p-6">
          <div className="text-3xl font-bold text-amber-400">{highRisk.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">⚠️ Alto Risco (≤5m)</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-orange-500/30 p-6">
          <div className="text-3xl font-bold text-orange-400">{needsBoat.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🚤 Precisa de Barco</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="text-3xl font-bold text-slate-100">{residences.filter(r => r.evacuation_logistics === 'truck').length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🚚 Precisa Caminhão</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-red-500/20 p-6">
        <h2 className="text-xl font-bold text-red-400 mb-4">🚨 Prioridade de Resgate</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Logística</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Grupo Vulnerável</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Inundação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {priority.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${EVAC_STATUS[r.evacuation_status]?.bg || 'bg-slate-500/20'} ${EVAC_STATUS[r.evacuation_status]?.color || 'text-slate-400'}`}>
                      {EVAC_STATUS[r.evacuation_status]?.label || 'Desconhecido'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {r.evacuation_logistics === 'boat' ? '🚤 Barco' : r.evacuation_logistics === 'truck' ? '🚚 Caminhão' : '🚗 Veículo'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {[r.has_elderly && '👴', r.has_children && '👶', r.has_pregnant && '🤰', r.has_disabled && '♿'].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.flood_level}m</td>
                </tr>
              ))}
              {priority.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhuma prioridade no momento</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SaudeTab({ residences }) {
  const comSaude = residences.filter(r => r.comorbidities || r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled)
  const vulneraveis = residences.filter(r => r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled)

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-blue-500/30 p-6">
          <div className="text-3xl font-bold text-blue-400">{vulneraveis.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">Grupos Vulneráveis</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-sky-500/30 p-6">
          <div className="text-3xl font-bold text-sky-400">{residences.filter(r => r.has_elderly).length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">👴 Idosos</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-green-500/30 p-6">
          <div className="text-3xl font-bold text-green-400">{residences.filter(r => r.has_children).length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">👶 Crianças</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-pink-500/30 p-6">
          <div className="text-3xl font-bold text-pink-400">{residences.filter(r => r.has_pregnant).length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🤰 Gestantes</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-6">
          <div className="text-3xl font-bold text-purple-400">{residences.filter(r => r.has_disabled).length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">♿ PCD</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
          <div className="text-3xl font-bold text-slate-100">{residences.filter(r => r.comorbidities).length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">Com Comorbidades</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">🏥 Residências com Necessidades de Saúde</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Vulnerabilidades</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Comorbidades</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {comSaude.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3 text-sm">
                    {[r.has_elderly && '👴', r.has_children && '👶', r.has_pregnant && '🤰', r.has_disabled && '♿'].filter(Boolean).join(' ') || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300 max-w-[200px] truncate">{r.comorbidities || '—'}</td>
                  <td className="px-4 py-3">
                    {r.flood_level <= 4 ? <span className="text-red-400 text-xs font-bold">ALTO</span> : r.flood_level <= 6 ? <span className="text-amber-400 text-xs">Médio</span> : <span className="text-emerald-400 text-xs">Baixo</span>}
                  </td>
                </tr>
              ))}
              {comSaude.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-500">Nenhum dado de saúde cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AssistenciaTab({ residences }) {
  const semApoio = residences.filter(r => r.shelter_plan === 'other' || !r.shelter_plan)
  const emAbrigo = residences.filter(r => r.evacuation_status === 'in_shelter' || r.shelter_name)

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-purple-500/30 p-6">
          <div className="text-3xl font-bold text-purple-400">{residences.filter(r => r.shelter_plan === 'public_shelter').length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🏠 Precisam de Abrigo Público</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-amber-500/30 p-6">
          <div className="text-3xl font-bold text-amber-400">{semApoio.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">⚠️ Sem Rede de Apoio</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-emerald-500/30 p-6">
          <div className="text-3xl font-bold text-emerald-400">{emAbrigo.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">✅ Em Abrigo / Acolhidos</div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">🤝 Famílias que Precisam de Acolhimento</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Moradores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Plano Abrigo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Abrigo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {residences.filter(r => r.shelter_plan === 'public_shelter' || r.evacuation_status === 'not_rescued').map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.residents}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.shelter_plan === 'public_shelter' ? 'Abrigo Público' : r.shelter_plan === 'relatives' ? 'Parentes' : r.shelter_plan === 'hotel' ? 'Hotel' : 'Outro'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${EVAC_STATUS[r.evacuation_status]?.bg || 'bg-slate-500/20'} ${EVAC_STATUS[r.evacuation_status]?.color || 'text-slate-400'}`}>
                      {EVAC_STATUS[r.evacuation_status]?.label || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.shelter_name || '—'}</td>
                </tr>
              ))}
              {residences.filter(r => r.shelter_plan === 'public_shelter' || r.evacuation_status === 'not_rescued').length === 0 &&
                <tr><td colSpan="6" className="text-center py-8 text-slate-500">Nenhuma família precisa de acolhimento no momento</td></tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function AgentesPendentesTab() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const loadAgents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/pending-agents')
      setAgents(res.data)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { loadAgents() }, [])

  const handleAction = async (userId, action) => {
    setActionMsg('')
    try {
      await api.post('/auth/approve-agent', { userId, action })
      setActionMsg(action === 'approve' ? 'Agente aprovado com sucesso!' : 'Agente rejeitado.')
      loadAgents()
    } catch (err) {
      setActionMsg('Erro: ' + (err.response?.data?.error || err.message))
    }
  }

  if (loading) return <div className="text-center py-12 text-slate-400">Carregando agentes pendentes...</div>

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className={`px-4 py-3 rounded-xl ${
          actionMsg.startsWith('Erro') ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>{actionMsg}</div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Agentes Pendentes de Aprovação</h2>
        <p className="text-sm text-slate-400 mb-6">Agentes cadastrados aguardam sua autorização para acessar o sistema.</p>

        {agents.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum agente pendente no momento.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Área de Atuação</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Cadastro</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {agents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{a.email}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{a.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{a.agent_area || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleAction(a.id, 'approve')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-all font-medium">
                        Aprovar
                      </button>
                      <button onClick={() => handleAction(a.id, 'reject')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-all font-medium">
                        Rejeitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const COLUNAS_MODELO = [
  'address (Endereço)',
  'neighborhood (Bairro)',
  'residents (Moradores)',
  'name (Nome do cidadão)',
  'email (Email do cidadão)',
  'phone (Telefone)',
  'hasElderly (Possui idoso)',
  'hasChildren (Possui criança)',
  'hasPregnant (Possui gestante)',
  'hasDisabled (Possui PCD)',
  'evacuationLogistics (Logística: boat, vehicle, truck)',
  'shelterPlan (Plano abrigo: public_shelter, relatives, hotel, other)',
  'floodLevel (Nível de inundação em metros)',
]

function ImportarTab() {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [logs, setLogs] = useState([])

  const loadLogs = async () => {
    try {
      const res = await api.get('/import/logs')
      setLogs(res.data)
    } catch { }
  }

  useEffect(() => { loadLogs() }, [])

  const handleUpload = async () => {
    if (!file) { setError('Selecione um arquivo'); return }
    setError('')
    setResult(null)
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await api.post('/import/excel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      loadLogs()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao importar')
    }
    setUploading(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Importar Residências por Planilha</h2>
        <p className="text-sm text-slate-400 mb-6">
          Faça upload de um arquivo <strong>.xlsx</strong> com os dados dos munícipes. A primeira linha deve conter os cabeçalhos (em português ou inglês).
        </p>

        {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4">{error}</div>}
        {result && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-4">
            Importado com sucesso! {result.imported} residências importadas{result.skipped ? `, ${result.skipped} ignoradas` : ''}.
          </div>
        )}

        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-primary-500/50 transition-all mb-6">
          <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files[0])} className="hidden" id="excel-upload" />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <div className="text-4xl mb-3 text-slate-500">📁</div>
            <p className="text-slate-300 font-medium mb-1">{file ? file.name : 'Clique para selecionar o arquivo'}</p>
            <p className="text-xs text-slate-500">Formatos aceitos: .xlsx</p>
          </label>
        </div>

        <button onClick={handleUpload} disabled={!file || uploading}
          className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-primary-600/20"
        >{uploading ? 'Importando...' : 'Importar Planilha'}</button>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Modelo de Planilha</h2>
        <p className="text-sm text-slate-400 mb-4">A planilha deve conter as seguintes colunas (a ordem não importa):</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {COLUNAS_MODELO.map(col => (
            <div key={col} className="px-4 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-300 font-mono border border-slate-700">
              {col}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-4">
          Colunas opcionais: endereco, bairro, endereço, bairro (versões em português também são reconhecidas).
          Valores booleanos: "sim", "s", "true", "1" para verdadeiro; "não", "nao", "n", "false", "0" para falso.
        </p>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">Histórico de Importações</h2>
        {logs.length === 0 ? (
          <p className="text-slate-500 text-center py-6">Nenhuma importação realizada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Importadas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ignoradas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Arquivo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Importado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm text-slate-300">{new Date(l.created_at).toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100">{l.imported_rows}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{l.skipped_rows}</td>
                    <td className="px-4 py-3 text-sm text-slate-400 font-mono text-xs">{l.filename}</td>
                    <td className="px-4 py-3 text-sm text-slate-300">{l.imported_by_name || l.imported_by_email || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Exportar CSV</h2>
        <p className="text-sm text-slate-400 mb-6">
          Baixe todas as residências cadastradas em formato CSV para análise em planilhas.
        </p>
        <a
          href={`${import.meta.env.VITE_API_URL || ''}/residence/export/csv`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl hover:bg-emerald-500 font-semibold transition-all shadow-lg shadow-emerald-600/20"
        >
          <span className="text-lg">⬇</span>
          Exportar CSV
        </a>
      </div>
    </div>
  )
}

function AgenteTab() {
  const { user } = useAuth()
  const [busca, setBusca] = useState('')
  const [residences, setResidences] = useState([])
  const [loading, setLoading] = useState(false)

  const [markerPosition, setMarkerPosition] = useState(null)
  const [formData, setFormData] = useState({
    userEmail: '', userName: '',
    address: '', neighborhood: '', residents: 1,
    hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
    comorbidities: '', pets: '', evacuationLogistics: '', shelterPlan: '',
    preventiveAid: '', floodLevel: 10, evacuationLevel: null,
    latitude: null, longitude: null,
    evacuationStatus: 'unknown', agentNotes: '', shelterName: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [statusUpdate, setStatusUpdate] = useState({ id: null, status: 'unknown', shelterName: '', agentNotes: '' })

  const loadResidences = async () => {
    setLoading(true)
    try {
      const res = await api.get('/residence/all?limit=500')
      setResidences(res.data.residences)
    } catch { }
    setLoading(false)
  }

  useEffect(() => { loadResidences() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setApiError('')
    setSuccess('')
    setSaving(true)
    try {
      await api.post('/residence/agent-register', formData)
      setSuccess('Residência cadastrada com sucesso!')
      setMarkerPosition(null)
      setFormData({
        userEmail: '', userName: '', address: '', neighborhood: '', residents: 1,
        hasElderly: false, hasChildren: false, hasPregnant: false, hasDisabled: false,
        comorbidities: '', pets: '', evacuationLogistics: '', shelterPlan: '',
        preventiveAid: '', floodLevel: 10, evacuationLevel: null,
        latitude: null, longitude: null, evacuationStatus: 'unknown', agentNotes: '', shelterName: '',
      })
      loadResidences()
    } catch (err) {
      setApiError(err.response?.data?.error || 'Erro ao cadastrar')
    }
    setSaving(false)
  }

  const updateStatus = async (residenceId) => {
    try {
      await api.put(`/residence/${residenceId}/status`, statusUpdate)
      setStatusUpdate({ id: null, status: 'unknown', shelterName: '', agentNotes: '' })
      loadResidences()
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar')
    }
  }

  const filtered = residences.filter(r =>
    r.address?.toLowerCase().includes(busca.toLowerCase()) ||
    r.name?.toLowerCase().includes(busca.toLowerCase()) ||
    r.neighborhood?.toLowerCase().includes(busca.toLowerCase()) ||
    r.email?.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">👤 Cadastrar Residência (por Agente)</h2>
        {apiError && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl mb-4">{apiError}</div>}
        {success && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-4">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input placeholder="Email do cidadão" value={formData.userEmail} onChange={e => setFormData(p => ({ ...p, userEmail: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
            <input placeholder="Nome do cidadão" value={formData.userName} onChange={e => setFormData(p => ({ ...p, userName: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <LocationPicker position={markerPosition} onPositionChange={pos => { setMarkerPosition(pos); setFormData(p => ({ ...p, latitude: pos.lat, longitude: pos.lng })) }} />
          <div className="grid md:grid-cols-3 gap-4">
            <input placeholder="Endereço completo" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 md:col-span-2" />
            <select value={formData.neighborhood} onChange={e => setFormData(p => ({ ...p, neighborhood: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="">Bairro</option>
              {['Centro','Bela Vista','Cidade Alta','Cidade Baixa','Fátima','Bandeira Branca','Santo Antônio','Santa Rita','São Francisco','São Thomás','Lago Parque Clube',"Passo D'Areia",'Princesa Isabel','Quininho','Vila Nova','Medianeira','Olaria','Estaleiro','Beira Rio','Lindos Ares','Padre Reus','Piratini','Sol Nascente'].map(b =>
                <option key={b} value={b}>{b}</option>
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Idoso','Criança','Gestante','PCD'].map((label, i) => {
              const key = ['hasElderly','hasChildren','hasPregnant','hasDisabled'][i]
              return (
                <label key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all ${formData[key] ? 'bg-primary-500/10 border-primary-500/40 text-primary-300' : 'bg-slate-800 border-slate-600 text-slate-400'}`}>
                  <input type="checkbox" checked={formData[key]} onChange={e => setFormData(p => ({ ...p, [key]: e.target.checked }))} className="sr-only" />
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formData[key] ? 'bg-primary-500 border-primary-500' : 'border-slate-500'}`}>
                    {formData[key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sm">{label}</span>
                </label>
              )
            })}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <input type="number" placeholder="Moradores" value={formData.residents} onChange={e => setFormData(p => ({ ...p, residents: parseInt(e.target.value) || 1 }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" min="1" />
            <select value={formData.evacuationLogistics} onChange={e => setFormData(p => ({ ...p, evacuationLogistics: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="">Logística de Evacuação</option>
              <option value="vehicle">Veículo próprio</option>
              <option value="truck">Precisa de caminhão</option>
              <option value="boat">Precisa de barco</option>
            </select>
            <select value={formData.shelterPlan} onChange={e => setFormData(p => ({ ...p, shelterPlan: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="">Plano de Abrigo</option>
              <option value="relatives">Casa de parentes</option>
              <option value="public_shelter">Abrigo público</option>
              <option value="hotel">Hotel</option>
              <option value="other">Outro</option>
            </select>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <input type="number" step="0.1" placeholder="Nível de inundação (m)" value={formData.floodLevel} onChange={e => setFormData(p => ({ ...p, floodLevel: parseFloat(e.target.value) || 10 }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
            <input type="number" step="0.1" placeholder="Nível de alerta (m)" value={formData.evacuationLevel || ''} onChange={e => setFormData(p => ({ ...p, evacuationLevel: parseFloat(e.target.value) || null }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200" />
            <input placeholder="Abrigo / Local atual" value={formData.shelterName} onChange={e => setFormData(p => ({ ...p, shelterName: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <select value={formData.evacuationStatus} onChange={e => setFormData(p => ({ ...p, evacuationStatus: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200">
              <option value="unknown">Status de evacuação</option>
              <option value="not_rescued">🔴 Aguardando Resgate</option>
              <option value="evacuated">🟢 Evacuado</option>
              <option value="in_shelter">🏠 Em Abrigo</option>
              <option value="with_family">👪 Com Familiares</option>
            </select>
            <textarea placeholder="Observações do agente" value={formData.agentNotes} onChange={e => setFormData(p => ({ ...p, agentNotes: e.target.value }))}
              className="px-4 py-3 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500" rows="1" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-primary-600/20"
          >{saving ? 'Salvando...' : 'Cadastrar Residência'}</button>
        </form>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-100">📋 Residências Cadastradas</h2>
          <input placeholder="Buscar por endereço, nome ou bairro..." value={busca} onChange={e => setBusca(e.target.value)}
            className="px-4 py-2 border-2 border-slate-700 rounded-xl bg-slate-800 text-slate-200 placeholder-slate-500 w-72" />
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Cidadão</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${EVAC_STATUS[r.evacuation_status]?.bg || 'bg-slate-500/20'} ${EVAC_STATUS[r.evacuation_status]?.color || 'text-slate-400'}`}>
                      {EVAC_STATUS[r.evacuation_status]?.label || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {statusUpdate.id === r.id ? (
                      <div className="flex gap-2 items-center">
                        <select value={statusUpdate.status} onChange={e => setStatusUpdate(p => ({ ...p, status: e.target.value }))}
                          className="px-2 py-1 text-xs border border-slate-700 rounded-lg bg-slate-800 text-slate-200">
                          {Object.entries(EVAC_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <input placeholder="Abrigo" value={statusUpdate.shelterName} onChange={e => setStatusUpdate(p => ({ ...p, shelterName: e.target.value }))}
                          className="px-2 py-1 text-xs border border-slate-700 rounded-lg bg-slate-800 text-slate-200 w-24" />
                        <button onClick={() => updateStatus(r.id)} className="px-2 py-1 bg-primary-600 text-white text-xs rounded-lg">Salvar</button>
                        <button onClick={() => setStatusUpdate({ id: null, status: 'unknown', shelterName: '', agentNotes: '' })} className="px-2 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg">X</button>
                      </div>
                    ) : (
                      <button onClick={() => setStatusUpdate({ id: r.id, status: r.evacuation_status || 'unknown', shelterName: r.shelter_name || '', agentNotes: '' })}
                        className="px-3 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg hover:bg-slate-600 transition-all">
                        Atualizar Status
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="5" className="text-center py-8 text-slate-500">Nenhuma residência encontrada</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">⏱️ Verificar Alertas Automáticos</h2>
        <button onClick={async () => {
          try {
            const resp = await api.get('/auto-alerts/check')
            alert(`Alertas gerados: ${resp.data.alertsCreated} | Residências em risco: ${resp.data.atRiskCount} | Nível do rio: ${resp.data.riverLevel}m`)
            loadResidences()
          } catch (err) {
            alert('Erro: ' + (err.response?.data?.error || err.message))
          }
        }}
          className="px-5 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-500 font-semibold transition-all shadow-lg"
        >
          🚨 Verificar e Gerar Alertas Automáticos
        </button>
        <p className="text-xs text-slate-500 mt-2">Esta ação verifica o nível atual do rio e gera alertas para residências cujo nível de evacuação foi atingido.</p>
      </div>
    </div>
  )
}
