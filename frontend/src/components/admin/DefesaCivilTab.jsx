import { useState, useEffect, useMemo } from 'react'
import LoadingSkeleton from '../ui/LoadingSkeleton'
import EmptyState from '../ui/EmptyState'
import { showToast } from '../ui/Toast'
import api from '../../services/api'

export default function DefesaCivilTab({ residences }) {
  const [level, setLevel] = useState(4)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailBairro, setDetailBairro] = useState(null)
  const [expandMatrix, setExpandMatrix] = useState(false)
  const [apiFailed, setApiFailed] = useState(false)
  const [checkingAlerts, setCheckingAlerts] = useState(false)
  const [alertResult, setAlertResult] = useState(null)

  const handleCheckAlerts = async () => {
    setCheckingAlerts(true)
    setAlertResult(null)
    try {
      const resp = await api.get('/auto-alerts/check')
      setAlertResult(resp.data)
      showToast('Alertas verificados com sucesso!', 'success')
    } catch (err) {
      showToast('Erro ao verificar alertas', 'error')
    }
    setCheckingAlerts(false)
  }

  const matrix = useMemo(() => {
    const levels = Array.from({ length: 15 }, (_, i) => i + 1)
    return levels.map(l => {
      const affected = residences.filter(r => r.flood_level <= l)
      const byBairro = {}
      affected.forEach(r => { byBairro[r.neighborhood] = (byBairro[r.neighborhood] || 0) + 1 })
      return { level: l, total: affected.length, bairros: Object.entries(byBairro).sort((a, b) => b[1] - a[1]) }
    })
  }, [residences])
  const getBarWidth = (count) => { const m = Math.max(...matrix.map(x => x.total), 1); return (count / m) * 100 }

  const apiUrl = import.meta.env.VITE_API_URL || '/api'

  const buildFallbackData = (lvl) => {
    const affected = residences.filter(r => r.flood_level != null && r.latitude != null && r.longitude != null && r.flood_level <= lvl)
    const nb = {}
    for (const r of affected) {
      const bairro = r.neighborhood || 'Sem bairro'
      if (!nb[bairro]) nb[bairro] = { affectedStreets: [], totalResidences: 0, totalResidents: 0, residences: [] }
      nb[bairro].totalResidences++
      nb[bairro].totalResidents += r.residents || 0
      nb[bairro].residences.push({
        id: r.id, address: r.address, house_number: r.house_number,
        neighborhood: r.neighborhood, residents: r.residents,
        has_elderly: !!r.has_elderly, has_children: !!r.has_children,
        has_pregnant: !!r.has_pregnant, has_disabled: !!r.has_disabled,
        comorbidities: r.comorbidities, telefone_contato: r.telefone_contato,
        telefone_emergencia: r.telefone_emergencia, possui_veiculo: !!r.possui_veiculo,
        evacuation_logistics: r.evacuation_logistics, shelter_plan: r.shelter_plan,
        pets: r.pets, user_name: r.user_name, user_phone: r.user_phone,
        evacuation_status: r.evacuation_status, flood_level: r.flood_level,
      })
    }
    for (const bairro of Object.keys(nb)) {
      const streetNames = [...new Set(nb[bairro].residences.map(r => r.address).filter(Boolean))]
      nb[bairro].affectedStreets = streetNames.sort()
    }
    return {
      level: lvl, totalAffected: affected.length,
      totalResidents: affected.reduce((s, r) => s + (r.residents || 0), 0),
      totalStreets: [...new Set(affected.map(r => r.address).filter(Boolean))].length,
      neighborhoods: nb,
    }
  }

  useEffect(() => {
    setLoading(true)
    setDetailBairro(null)
    setApiFailed(false)
    fetch(`${apiUrl}/flood/impact/${level}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { setData(d); setApiFailed(false) }
        else { setData(buildFallbackData(level)); setApiFailed(true) }
      })
      .catch(() => { setData(buildFallbackData(level)); setApiFailed(true) })
      .finally(() => setLoading(false))
  }, [level, residences])

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Defesa Civil</h2>
            <p className="text-sm text-slate-400">Impacto por nível do rio — selecione o nível para ver ruas e residências afetadas</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">{level.toFixed(1)}m</div>
            <div className="text-sm text-slate-500">nível selecionado</div>
          </div>
        </div>
        <input type="range" min={4} max={15} step={0.2} value={level}
          onChange={e => setLevel(parseFloat(e.target.value))}
          aria-label="Nível de inundação"
          className="w-full h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-full appearance-none cursor-pointer accent-blue-500 mb-4"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>4.0m</span>
          <span>9.5m</span>
          <span>15.0m</span>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl border border-amber-500/20 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <h3 className="text-base font-bold text-slate-100">⏱️ Verificar Alertas Automáticos</h3>
          <p className="text-xs text-slate-500 mt-1">Verifica o nível atual do rio e gera alertas para residências cujo nível de evacuação foi atingido.</p>
        </div>
        {alertResult && (
          <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-xl">
            Alertas: <span className="text-amber-400 font-semibold">{alertResult.alertsCreated}</span> | Em risco: <span className="text-red-400 font-semibold">{alertResult.atRiskCount}</span> | Rio: <span className="text-blue-400 font-semibold">{alertResult.riverLevel}m</span>
          </div>
        )}
        <button onClick={handleCheckAlerts} disabled={checkingAlerts}
          className="px-5 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-500 disabled:opacity-50 font-semibold transition-all shadow-lg text-sm whitespace-nowrap"
        >
          {checkingAlerts ? 'Verificando...' : '🚨 Verificar e Gerar Alertas Automáticos'}
        </button>
      </div>

      {apiFailed && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 px-4 py-2 rounded-xl text-xs">
          API de impacto indisponível — exibindo dados estimados por nível de inundação cadastrado
        </div>
      )}

      {loading && (
        <LoadingSkeleton rows={5} />
      )}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 rounded-xl border border-amber-500/30 p-6">
              <div className="text-3xl font-bold text-amber-400">{data.totalAffected}</div>
              <div className="text-sm text-slate-400 font-medium mt-1">Residências Afetadas</div>
            </div>
            <div className="bg-slate-900 rounded-xl border border-blue-500/30 p-6">
              <div className="text-3xl font-bold text-blue-400">{data.totalResidents}</div>
              <div className="text-sm text-slate-400 font-medium mt-1">Moradores Afetados</div>
            </div>
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
              <div className="text-3xl font-bold text-slate-100">{data.totalStreets}</div>
              <div className="text-sm text-slate-400 font-medium mt-1">Ruas Afetadas</div>
            </div>
            <div className="bg-slate-900 rounded-xl border border-purple-500/30 p-6">
              <div className="text-3xl font-bold text-purple-400">{Object.keys(data.neighborhoods).length}</div>
              <div className="text-sm text-slate-400 font-medium mt-1">Bairros Atingidos</div>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100">Visão Geral por Nível</h2>
              <button onClick={() => setExpandMatrix(!expandMatrix)} className="text-xs text-blue-400 hover:text-blue-300 font-medium">
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
                    {matrix.filter(m => m.level >= 4).map(m => {
                      const atLevel = residences.filter(r => r.flood_level <= m.level)
                      const vulneraveis = atLevel.filter(r => r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled)
                      return (
                        <tr key={m.level} className={`hover:bg-slate-800/40 cursor-pointer transition-colors ${Math.round(m.level) === Math.round(level) ? 'bg-blue-500/10' : ''}`} onClick={() => setLevel(m.level)}>
                          <td className={`px-3 py-2 font-bold ${m.level >= 10 ? 'text-red-400' : m.level >= 6 ? 'text-amber-400' : 'text-emerald-400'}`}>{m.level}m</td>
                          <td className="px-3 py-2 font-semibold text-slate-200">{m.total}</td>
                          <td className="px-3 py-2 text-slate-300">{atLevel.reduce((s, r) => s + r.residents, 0)}</td>
                          <td className="px-3 py-2 text-slate-300">{m.bairros.length}</td>
                          <td className="px-3 py-2">
                            <div className="w-24 bg-slate-700/50 rounded-full h-3 overflow-hidden">
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

          <div className="space-y-4">
            {Object.entries(data.neighborhoods).sort((a, b) => b[1].totalResidences - a[1].totalResidences).map(([bairro, nb]) => (
              <div key={bairro} className="bg-slate-900 rounded-xl border border-slate-800 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-100">{bairro}</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {nb.totalResidences} residência{nb.totalResidences !== 1 ? 's' : ''} ({nb.totalResidents} moradore{nb.totalResidents !== 1 ? 's' : ''})
                    </p>
                    {nb.affectedStreets.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {nb.affectedStreets.map(street => (
                          <span key={street} className="px-2 py-0.5 text-xs bg-slate-800 text-slate-300 rounded-full">
                            {street}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setDetailBairro(detailBairro === bairro ? null : bairro)}
                    className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all ml-3 flex-shrink-0"
                  >
                    {detailBairro === bairro ? 'Fechar' : 'Detalhes'}
                  </button>
                </div>

                {detailBairro === bairro && (
                  <div className="mt-4 border-t border-slate-800 pt-4">
                    <div className="overflow-x-auto max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800/50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Rua</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Nº</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Moradores</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Contato</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Vulneráveis</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase">Inunda</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {nb.residences.sort((a, b) => a.address?.localeCompare(b.address || '') || 0).map(r => (
                            <tr key={r.id} className="hover:bg-slate-800/50 transition-colors">
                              <td className="px-3 py-2 text-slate-100 font-medium">{r.address}</td>
                              <td className="px-3 py-2 text-slate-300">{r.house_number || '-'}</td>
                              <td className="px-3 py-2 text-slate-300">{r.residents || 0}</td>
                              <td className="px-3 py-2 text-slate-300 text-xs">
                                {r.telefone_contato || r.user_phone || '-'}
                              </td>
                              <td className="px-3 py-2 text-xs">
                                {[r.has_elderly && '👴', r.has_children && '👶', r.has_pregnant && '🤰', r.has_disabled && '♿'].filter(Boolean).join(' ') || '-'}
                              </td>
                              <td className="px-3 py-2 text-slate-300">{r.flood_level ? `${r.flood_level}m` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {Object.keys(data.neighborhoods).length === 0 && (
              <EmptyState
                icon="🏠"
                title="Nenhuma residência afetada"
                description="Nenhuma residência cadastrada é afetada neste nível de inundação."
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}
