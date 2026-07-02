import { useState, useMemo } from 'react'
import { healthMarkerLabel } from '../../constants/healthMarkers'

function safeMembers(residence) {
  if (!residence.household_members) return []
  try {
    const parsed = typeof residence.household_members === 'string'
      ? JSON.parse(residence.household_members)
      : residence.household_members
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// household_members traz o detalhe por pessoa quando veio da planilha de
// saúde. Residências sem esse detalhe (import genérico, edição manual do
// agente) ainda podem ter os booleanos de nível de casa — nesse caso conta
// como 1 pessoa, pra não sumir da contagem só por falta de detalhamento fino.
const MARKER_DEFS = [
  { id: 'hipertensao', label: 'HAS', icon: '🩺', booleanKey: 'comorbidade_has' },
  { id: 'diabetes', label: 'DM', icon: '🩸', booleanKey: 'comorbidade_diabetes' },
  { id: 'crianca', label: 'Crianças', icon: '👶', booleanKey: 'has_children', isChild: true },
  { id: 'idoso', label: 'Idosos', icon: '👴', booleanKey: 'has_elderly' },
  { id: 'gestante', label: 'Gestantes', icon: '🤰', booleanKey: 'has_pregnant' },
  { id: 'pcd', label: 'PCD', icon: '♿', booleanKey: 'has_disabled' },
  { id: 'acamado', label: 'Acamados', icon: '🛏️' },
  { id: 'domiciliado', label: 'Domiciliados', icon: '🏠' },
  { id: 'dependente_oxigenio', label: 'Dependentes de O₂', icon: '💨' },
]

function personMatches(member, def) {
  return def.isChild ? !!member.isChild : (member.healthMarkers || []).includes(def.id)
}

function countPeople(list, def) {
  return list.reduce((sum, r) => {
    if (r._members.length > 0) return sum + r._members.filter(m => personMatches(m, def)).length
    return sum + (def.booleanKey && r[def.booleanKey] ? 1 : 0)
  }, 0)
}

function countFamilies(list, def) {
  return list.filter(r => {
    if (r._members.length > 0) return r._members.some(m => personMatches(m, def))
    return def.booleanKey && r[def.booleanKey]
  }).length
}

function totalPeople(list) {
  return list.reduce((sum, r) => sum + (r._members.length > 0 ? r._members.length : (r.residents || 0)), 0)
}

function StatCard({ value, label, icon, colorClass }) {
  return (
    <div className={`bg-slate-900 rounded-2xl border ${colorClass} p-5`}>
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-400 font-medium mt-1">{icon ? `${icon} ` : ''}{label}</div>
    </div>
  )
}

export default function SaudeTab({ residences }) {
  const withMembers = useMemo(() => residences.map(r => ({ ...r, _members: safeMembers(r) })), [residences])
  const [nivelSimulado, setNivelSimulado] = useState('')

  const comSaude = withMembers.filter(r => r.comorbidities || r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled || r._members.length > 0)
  const vulneraveis = withMembers.filter(r => r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled)

  // Prioridade de evacuação: casas com HAS/DM e nível de evacuação já
  // calculado, ordenadas pelas mais urgentes primeiro.
  const prioridade = withMembers
    .filter(r => (r.comorbidade_has || r.comorbidade_diabetes) && r.evacuation_level != null)
    .sort((a, b) => a.evacuation_level - b.evacuation_level)

  const nivel = parseFloat(nivelSimulado)
  const simulando = nivelSimulado !== '' && !isNaN(nivel)
  const afetadas = simulando ? withMembers.filter(r => r.flood_level != null && r.flood_level <= nivel) : []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-3">Resumo Geral</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard value={withMembers.length} label="Famílias cadastradas" icon="🏘️" colorClass="border-blue-500/30" />
          <StatCard value={totalPeople(withMembers)} label="Pessoas cadastradas" icon="👥" colorClass="border-blue-500/30" />
          <StatCard value={vulneraveis.length} label="Grupos Vulneráveis" icon="⚠️" colorClass="border-blue-500/30" />
          <StatCard value={countPeople(withMembers, MARKER_DEFS.find(m => m.id === 'dependente_oxigenio'))} label="Dependentes de O₂" colorClass="border-slate-800" />
          {MARKER_DEFS.filter(d => !['dependente_oxigenio'].includes(d.id)).map(def => (
            <StatCard key={def.id} value={countPeople(withMembers, def)} label={def.label} icon={def.icon} colorClass="border-slate-800" />
          ))}
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">🌊 Simulador: se o Rio Jacuí atingir X metros</h2>
        <p className="text-sm text-slate-400 mb-4">
          Digite um nível do rio para ver quantas famílias seriam atingidas e a necessidade de saúde de cada uma —
          baseado no <code className="text-slate-300">flood_level</code> calculado por residência.
        </p>
        <div className="flex items-end gap-3 mb-5">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nível do rio (m)</label>
            <input
              type="number" step="0.1" min="0" max="15" placeholder="Ex: 6"
              value={nivelSimulado} onChange={e => setNivelSimulado(e.target.value)}
              className="w-32 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100"
            />
          </div>
          {simulando && (
            <button onClick={() => setNivelSimulado('')} className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-200">
              Limpar
            </button>
          )}
        </div>

        {simulando && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <StatCard value={afetadas.length} label="Famílias atingidas" icon="🏘️" colorClass="border-red-500/30" />
              <StatCard value={totalPeople(afetadas)} label="Pessoas atingidas" icon="👥" colorClass="border-red-500/30" />
              {MARKER_DEFS.map(def => {
                const fam = countFamilies(afetadas, def)
                const peo = countPeople(afetadas, def)
                if (fam === 0) return null
                return (
                  <StatCard key={def.id} value={`${peo} (${fam} fam.)`} label={def.label} icon={def.icon} colorClass="border-amber-500/30" />
                )
              })}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Atingida a partir de</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Necessidades</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {afetadas.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/50 align-top">
                      <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{r.flood_level}m</td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        <span className="flex flex-wrap gap-1">
                          {MARKER_DEFS.filter(def => countFamilies([r], def) > 0).map(def => (
                            <span key={def.id} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">{def.icon} {def.label}</span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {afetadas.length === 0 && (
                    <tr><td colSpan="4" className="text-center py-8 text-slate-500">Nenhuma residência atingida a {nivelSimulado}m</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-4">🏥 Residências com Necessidades de Saúde</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Moradores e marcadores</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Risco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {comSaude.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50 align-top">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {r._members.length > 0 ? (
                      <ul className="space-y-1">
                        {r._members.map((m, i) => (
                          <li key={i}>
                            <span className="text-slate-100">{m.name}</span>
                            {(m.healthMarkers || []).length > 0 && (
                              <span className="ml-2 flex flex-wrap gap-1 mt-0.5">
                                {m.healthMarkers.map(mk => (
                                  <span key={mk} className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">{healthMarkerLabel(mk)}</span>
                                ))}
                              </span>
                            )}
                            {m.isChild && <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Criança{m.ageNote ? ` (${m.ageNote})` : ''}</span>}
                            {m.note && <span className="block text-xs text-slate-500 mt-0.5">{m.note}</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (r.comorbidities || '—')}
                  </td>
                  <td className="px-4 py-3">
                    {r.flood_level <= 4 ? <span className="text-red-400 text-xs font-bold">ALTO</span> : r.flood_level <= 6 ? <span className="text-amber-400 text-xs">Médio</span> : <span className="text-emerald-400 text-xs">Baixo</span>}
                  </td>
                </tr>
              ))}
              {comSaude.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-slate-500">Nenhum dado de saúde cadastrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-100 mb-1">🚨 Prioridade de Evacuação (HAS/DM)</h2>
        <p className="text-sm text-slate-400 mb-4">
          Residências com HAS ou DM, ordenadas pelo nível em que o rio já exige evacuação — as mais urgentes primeiro.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Endereço</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Bairro</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Evacuar a partir de</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Comorbidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {prioridade.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 text-sm font-semibold text-slate-100">{r.address}</td>
                  <td className="px-4 py-3 text-sm text-slate-300">{r.neighborhood}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={r.evacuation_level <= 4 ? 'text-red-400 font-bold' : 'text-amber-400'}>{r.evacuation_level}m</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-300">
                    {r.comorbidade_has && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full mr-1">HAS</span>}
                    {r.comorbidade_diabetes && <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">DM</span>}
                  </td>
                </tr>
              ))}
              {prioridade.length === 0 && (
                <tr><td colSpan="4" className="text-center py-8 text-slate-500">Nenhuma residência com HAS/DM tem nível de evacuação calculado ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
