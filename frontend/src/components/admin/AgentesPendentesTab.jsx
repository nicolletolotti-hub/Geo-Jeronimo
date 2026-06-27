import { useState, useEffect } from 'react'
import api from '../../services/api'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'

const ALL_PROFILES = [
  { value: 'DEFESA_CIVIL', label: 'Defesa Civil', color: 'text-blue-400' },
  { value: 'SAUDE', label: 'Saúde', color: 'text-emerald-400' },
  { value: 'ASSISTENCIA_SOCIAL', label: 'Assistência Social', color: 'text-amber-400' },
  { value: 'DEFESA_ANIMAL', label: 'Defesa Animal', color: 'text-orange-400' },
  { value: 'AGENTE_CAMPO', label: 'Agente de Campo', color: 'text-violet-400' },
]

export default function AgentesPendentesTab() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')
  const [selectedProfiles, setSelectedProfiles] = useState({})

  const loadAgents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/pending-agents')
      setAgents(res.data)
    } catch { /* network error, agents stay empty */ }
    setLoading(false)
  }

  useEffect(() => { loadAgents() }, [])

  const toggleProfile = (userId, profile) => {
    setSelectedProfiles(prev => {
      const current = prev[userId] || []
      return {
        ...prev,
        [userId]: current.includes(profile) ? current.filter(p => p !== profile) : [...current, profile]
      }
    })
  }

  const handleAction = async (userId, action) => {
    setActionMsg('')
    try {
      await api.post('/auth/approve-agent', {
        userId,
        action,
        approvedProfiles: action === 'approve' ? (selectedProfiles[userId] || []) : undefined
      })
      setActionMsg(action === 'approve' ? 'Servidor aprovado com sucesso!' : 'Servidor rejeitado.')
      loadAgents()
      showToast(action === 'approve' ? 'Servidor aprovado!' : 'Servidor rejeitado.', 'success')
    } catch (err) {
      setActionMsg('Erro: ' + (err.response?.data?.error || err.message))
      showToast('Erro ao processar servidor', 'error')
    }
  }

  if (loading) return <LoadingSkeleton rows={5} />

  return (
    <div className="space-y-6">
      {actionMsg && (
        <div className={`px-4 py-3 rounded-xl ${
          actionMsg.startsWith('Erro') ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
        }`}>{actionMsg}</div>
      )}

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">Servidores Pendentes</h2>
        <p className="text-sm text-slate-400 mb-6">Cidadãos que solicitaram acesso ao painel de servidor.</p>

        {agents.length === 0 ? (
          <EmptyState
            icon="👤"
            title="Nenhum servidor pendente"
            description="Nenhum servidor pendente de aprovação no momento."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Perfil Solicitado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Abas de Acesso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {agents.map(a => (
                  <tr key={a.id} className="hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-100">{a.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{a.cpf || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full bg-slate-700/50 ${ALL_PROFILES.find(p => p.value === a.profile)?.color || 'text-slate-400'}`}>
                        {ALL_PROFILES.find(p => p.value === a.profile)?.label || a.profile}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{a.phone || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{new Date(a.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                        {ALL_PROFILES.map(p => {
                          const selected = (selectedProfiles[a.id] || []).includes(p.value)
                          return (
                            <button key={p.value} onClick={() => toggleProfile(a.id, p.value)}
                              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-all ${
                                selected
                                  ? 'bg-primary-500/20 border-primary-500/40 text-primary-400'
                                  : 'bg-slate-700/30 border-slate-600 text-slate-500 hover:text-slate-300'
                              }`}>
                              {p.label}
                            </button>
                          )
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleAction(a.id, 'approve')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-all font-medium disabled:opacity-50"
                          disabled={!(selectedProfiles[a.id] || []).length}>
                          Aprovar
                        </button>
                        <button onClick={() => handleAction(a.id, 'reject')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-all font-medium">
                          Rejeitar
                        </button>
                      </div>
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
