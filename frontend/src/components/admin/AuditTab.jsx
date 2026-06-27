import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function AuditTab() {
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(null)
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => {
    loadLogs()
    loadSummary()
  }, [page, actionFilter, entityFilter])

  async function loadLogs() {
    setLoading(true)
    try {
      const params = { page, limit: 30 }
      if (actionFilter) params.action = actionFilter
      if (entityFilter) params.entity_type = entityFilter
      const res = await api.get('/admin/audit-logs', { params })
      setLogs(res.data.logs || [])
      setPagination(res.data.pagination)
    } catch { setLogs([]) }
    setLoading(false)
  }

  async function loadSummary() {
    try {
      const res = await api.get('/admin/audit-summary')
      setSummary(res.data)
    } catch {}
  }

  const ACTION_COLORS = {
    LOGIN: 'text-emerald-400 bg-emerald-500/10',
    LOGOUT: 'text-slate-400 bg-slate-500/10',
    CREATE: 'text-blue-400 bg-blue-500/10',
    UPDATE: 'text-amber-400 bg-amber-500/10',
    DELETE: 'text-red-400 bg-red-500/10',
    VIEW: 'text-purple-400 bg-purple-500/10',
  }

  const ACTION_LABELS = {
    LOGIN: 'Login', LOGOUT: 'Logout',
    CREATE: 'Criação', UPDATE: 'Alteração',
    DELETE: 'Remoção', VIEW: 'Visualização',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-100">Registros de Auditoria</h2>
        {summary && (
          <span className="text-sm text-slate-500">{summary.total} registros</span>
        )}
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(summary.byAction || []).map(a => (
            <div key={a.action} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${ACTION_COLORS[a.action] || 'text-slate-300'}`}>
                {ACTION_LABELS[a.action] || a.action}
              </span>
              <p className="text-2xl font-bold text-slate-100 mt-1">{a.count}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-300 text-sm"
        >
          <option value="">Todas ações</option>
          <option value="LOGIN">Login</option>
          <option value="CREATE">Criação</option>
          <option value="UPDATE">Alteração</option>
          <option value="DELETE">Remoção</option>
          <option value="VIEW">Visualização</option>
        </select>
        <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value); setPage(1) }}
          className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-300 text-sm"
        >
          <option value="">Todas entidades</option>
          <option value="residence">Residência</option>
          <option value="user">Usuário</option>
          <option value="user_permission">Permissão</option>
          <option value="pet">Pet</option>
          <option value="alert">Alerta</option>
          <option value="shelter">Abrigo</option>
          <option value="evacuation_route">Rota de Evacuação</option>
          <option value="flood_impact">Impacto Enchente</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Carregando...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-slate-800">
          <span className="text-4xl block mb-3">📋</span>
          <p>Nenhum registro de auditoria encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id}
              className="bg-slate-800/40 border border-slate-700/50 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-slate-800/60 text-left"
              >
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${ACTION_COLORS[log.action] || 'text-slate-300 bg-slate-700'}`}>
                  {ACTION_LABELS[log.action] || log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-100 font-medium">{log.user_name || 'Sistema'}</span>
                    {log.user_profile && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-400">{log.user_profile}</span>
                    )}
                    <span className="text-slate-500 text-sm capitalize">{log.entity_type?.replace(/_/g, ' ')}</span>
                    {log.entity_id && <span className="text-slate-600 text-xs">ID {log.entity_id}</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(log.created_at + (log.created_at?.includes('T') ? '' : 'T12:00:00Z')).toLocaleString('pt-BR')}
                    {log.ip_address && ` · ${log.ip_address}`}
                  </p>
                </div>
                <span className="text-slate-600 text-sm transition-transform" style={{ transform: expandedId === log.id ? 'rotate(180deg)' : '' }}>
                  ▼
                </span>
              </button>
              {expandedId === log.id && (
                <div className="px-4 pb-4 border-t border-slate-700/30 pt-3 space-y-2">
                  {log.new_values && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-medium">Novos valores:</p>
                      <pre className="text-xs text-slate-300 bg-slate-900/50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.new_values, null, 2)}
                      </pre>
                    </div>
                  )}
                  {log.old_values && (
                    <div>
                      <p className="text-xs text-slate-500 mb-1 font-medium">Valores anteriores:</p>
                      <pre className="text-xs text-slate-400 bg-slate-900/50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.old_values, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-4 py-2 text-slate-400">
            {pagination.page} / {pagination.pages}
          </span>
          <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40"
          >
            Próximo
          </button>
        </div>
      )}
    </div>
  )
}
