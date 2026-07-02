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

export default function SaudeTab({ residences }) {
  const withMembers = residences.map(r => ({ ...r, _members: safeMembers(r) }))

  const countByMarker = (markerId) =>
    withMembers.reduce((sum, r) => sum + r._members.filter(m => (m.healthMarkers || []).includes(markerId)).length, 0)

  const countHAS = countByMarker('hipertensao')
  const countDM = countByMarker('diabetes')

  const comSaude = withMembers.filter(r => r.comorbidities || r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled || r._members.length > 0)
  const vulneraveis = withMembers.filter(r => r.has_elderly || r.has_children || r.has_pregnant || r.has_disabled)

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-2xl border border-blue-500/30 p-6">
          <div className="text-3xl font-bold text-blue-400">{vulneraveis.length}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">Grupos Vulneráveis</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-red-500/30 p-6">
          <div className="text-3xl font-bold text-red-400">{countHAS}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🩺 Pessoas com HAS</div>
        </div>
        <div className="bg-slate-900 rounded-2xl border border-orange-500/30 p-6">
          <div className="text-3xl font-bold text-orange-400">{countDM}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">🩸 Pessoas com DM</div>
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
          <div className="text-3xl font-bold text-slate-100">{countByMarker('dependente_oxigenio')}</div>
          <div className="text-sm text-slate-400 font-medium mt-1">Dependentes de O₂</div>
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
    </div>
  )
}
