import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import LoginForm from '../components/LoginForm'
import DefesaCivilTab from '../components/admin/DefesaCivilTab'
import SaudeTab from '../components/admin/SaudeTab'
import AssistenciaTab from '../components/admin/AssistenciaTab'
import AgentesPendentesTab from '../components/admin/AgentesPendentesTab'
import ImportTab from '../components/admin/ImportTab'
import ResidencesTab from '../components/admin/ResidencesTab'
import PetsTab from '../components/admin/PetsTab'
import KPICard from '../components/Dashboard/KPICard'

const TABS = [
  { key: 'defesa_civil', label: 'Defesa Civil' },
  { key: 'saude', label: 'Saúde' },
  { key: 'assistencia', label: 'Assistência Social' },
  { key: 'animais', label: 'Defesa Animal' },
  { key: 'agente', label: 'Agente' },
]

const ADMIN_TABS = [
  { key: 'agentes_pendentes', label: 'Agentes Pendentes' },
  { key: 'importar', label: 'Importar Excel' },
]

export default function AdminPanel() {
  const { user, isAuthenticated, isAgent, hasProfile, logout } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-xl">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">Painel do Servidor</h1>
          <p className="text-slate-400 mb-8">Acesso restrito a administradores e servidores municipais.</p>
          <LoginForm mode="admin" />
        </div>
      </div>
    )
  }

  if (user?.agentStatus === 'pending' && user?.profile !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
          <span className="text-5xl block mb-4">⏳</span>
          <h1 className="text-2xl font-bold text-amber-400 mb-3">Cadastro Pendente</h1>
          <p className="text-slate-300 text-lg mb-2">Seu cadastro como servidor ainda não foi aprovado.</p>
          <p className="text-slate-400">Aguarde a validação do administrador para acessar o sistema.</p>
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
          <p className="text-sm text-slate-500">Apenas administradores e servidores municipais podem acessar.</p>
        </div>
      </div>
    )
  }

  return <AdminDashboard user={user} onLogout={logout} />
}

const PROFILE_LABELS = {
  DEFESA_CIVIL: 'Defesa Civil',
  SAUDE: 'Saúde',
  ASSISTENCIA_SOCIAL: 'Assistência Social',
  DEFESA_ANIMAL: 'Defesa Animal',
  AGENTE_CAMPO: 'Agente de Campo',
}

function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('defesa_civil')
  const [residences, setResidences] = useState([])
  const [pets, setPets] = useState([])
  const [pendingAgents, setPendingAgents] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [res, petsRes, agentsRes, alertsRes] = await Promise.allSettled([
          api.get('/residence/all?limit=500'),
          api.get('/pets/all?limit=500'),
          api.get('/auth/agents/pending'),
          api.get('/alerts?limit=500'),
        ])
        if (res.status === 'fulfilled') setResidences(res.value.data.residences || [])
        if (petsRes.status === 'fulfilled') setPets(petsRes.value.data.pets || [])
        if (agentsRes.status === 'fulfilled') setPendingAgents(agentsRes.value.data.agents || [])
        if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data.alerts || [])
      } catch { /* ignore fetch errors */ }
      setLoading(false)
    }
    loadData()
  }, [])

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState('')
  const [pwdErr, setPwdErr] = useState('')

  const handleChangePassword = async () => {
    setPwdMsg(''); setPwdErr('')
    try {
      await api.put('/auth/change-password', { currentPassword: currentPwd, newPassword: newPwd })
      setPwdMsg('Senha alterada com sucesso!')
      setCurrentPwd(''); setNewPwd('')
    } catch (err) {
      setPwdErr(err.response?.data?.error || 'Erro ao alterar senha')
    }
  }

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-100 tracking-tight">Painel Municipal</h1>
          <p className="text-slate-400 text-lg inline-flex items-center gap-2">
            {user?.profile === 'ADMIN' ? 'Administrador' : (PROFILE_LABELS[user?.profile] || 'Servidor Municipal')}
            {user?.profile && user?.profile !== 'ADMIN' && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700/50 text-slate-400">{user.profile}</span>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowChangePassword(!showChangePassword)}
            className="px-4 py-2.5 border border-slate-700 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold transition-all duration-300 text-sm self-start"
          >
            🔑 Alterar Senha
          </button>
          <button onClick={onLogout}
            className="px-6 py-2.5 border border-slate-700 rounded-xl hover:bg-slate-800 text-slate-300 font-semibold transition-all duration-300 text-sm self-start"
          >
            Sair
          </button>
        </div>
      </div>

      {showChangePassword && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Alterar Senha</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full sm:w-auto">
              <label className="text-sm text-slate-400 mb-1 block">Senha Atual</label>
              <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <div className="flex-1 w-full sm:w-auto">
              <label className="text-sm text-slate-400 mb-1 block">Nova Senha</label>
              <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100" />
            </div>
            <button onClick={handleChangePassword}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-all duration-300"
            >
              Salvar
            </button>
          </div>
          {pwdMsg && <p className="text-sm mt-3 text-emerald-400">{pwdMsg}</p>}
          {pwdErr && <p className="text-sm mt-3 text-red-400">{pwdErr}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Residências"
          value={residences.length}
          icon="🏠"
          color="blue"
        />
        <KPICard
          title="Animais"
          value={pets.length}
          icon="🐾"
          color="amber"
        />
        <KPICard
          title="Agentes Pendentes"
          value={pendingAgents.length}
          icon="⏳"
          color="orange"
        />
        <KPICard
          title="Alertas Ativos"
          value={alerts.length}
          icon="🚨"
          color="red"
        />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2" role="tablist">
        {(() => {
          const isAdmin = user?.profile === 'ADMIN' || user?.role === 'admin' || user?.role === 'superadmin'
          const profileTabs = TABS.filter(t => {
            if (isAdmin) return true
            if (t.key === 'agente') return hasProfile('AGENTE_CAMPO')
            if (t.key === 'defesa_civil') return hasProfile('DEFESA_CIVIL')
            if (t.key === 'saude') return hasProfile('SAUDE')
            if (t.key === 'assistencia') return hasProfile('ASSISTENCIA_SOCIAL')
            if (t.key === 'animais') return hasProfile('DEFESA_ANIMAL')
            return false
          })
          const adminTabs = isAdmin ? ADMIN_TABS : []
          return [...profileTabs, ...adminTabs];
        })().map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} role="tab" aria-selected={activeTab === tab.key}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              activeTab === tab.key ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === 'defesa_civil' && <DefesaCivilTab residences={residences} />}
        {activeTab === 'saude' && <SaudeTab residences={residences} />}
        {activeTab === 'assistencia' && <AssistenciaTab residences={residences} />}
        {activeTab === 'agente' && <ResidencesTab />}
        {activeTab === 'agentes_pendentes' && <AgentesPendentesTab />}
        {activeTab === 'importar' && <ImportTab />}
        {activeTab === 'animais' && <PetsTab />}
      </div>
    </div>
  )
}
