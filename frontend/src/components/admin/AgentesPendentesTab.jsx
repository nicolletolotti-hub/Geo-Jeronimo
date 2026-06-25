import { useState, useEffect } from 'react'
import api from '../../services/api'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'

export default function AgentesPendentesTab() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState('')

  const loadAgents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/auth/pending-agents')
      setAgents(res.data)
    } catch { /* network error, agents stay empty */ }
    setLoading(false)
  }

  useEffect(() => { loadAgents() }, [])

  const handleAction = async (userId, action) => {
    setActionMsg('')
    try {
      await api.post('/auth/approve-agent', { userId, action })
      setActionMsg(action === 'approve' ? 'Agente aprovado com sucesso!' : 'Agente rejeitado.')
      loadAgents()
      showToast(action === 'approve' ? 'Agente aprovado com sucesso!' : 'Agente rejeitado.', 'success')
    } catch (err) {
      setActionMsg('Erro: ' + (err.response?.data?.error || err.message))
      showToast('Erro ao processar agente', 'error')
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
        <h2 className="text-xl font-bold text-slate-100 mb-1">Agentes Pendentes de Aprovação</h2>
        <p className="text-sm text-slate-400 mb-6">Agentes cadastrados aguardam sua autorização para acessar o sistema.</p>

        {agents.length === 0 ? (
          <EmptyState
            icon="👤"
            title="Nenhum agente pendente"
            description="Nenhum agente pendente de aprovação no momento."
          />
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
