import { useMemo } from 'react'

function sum(arr, fn) { return arr.reduce((s, r) => s + (fn(r) ? 1 : 0), 0) }
function sumVal(arr, fn) { return arr.reduce((s, r) => s + (fn(r) || 0), 0) }

function parsePetsInfo(petsInfo) {
  try { return JSON.parse(petsInfo || '[]') } catch { return [] }
}

export default function VulnerabilityDashboard({ residences, currentLevel }) {
  const stats = useMemo(() => {
    const byBairro = {}
    for (const r of residences) {
      const b = r.neighborhood || 'Sem bairro'
      if (!byBairro[b]) byBairro[b] = { residences: [] }
      byBairro[b].residences.push(r)
    }

    const rows = Object.entries(byBairro)
      .map(([bairro, { residences: res }]) => {
        const total = res.length
        const idosos = sum(res, r => r.has_elderly)
        const acamados = sum(res, r => r.comorbidade_mobilidade)
        const dependeO2 = sum(res, r => r.comorbidade_oxigenio)
        const precisaEvac = sum(res, r => r.needs_evacuation_help || (r.flood_level != null && currentLevel != null && r.flood_level <= currentLevel))
        const pets = sumVal(res, r => {
          try { return JSON.parse(r.pets_info || '[]').reduce((a, p) => a + (p.qty || 0), 0) } catch { return 0 }
        })
        const criancas = sum(res, r => r.has_children)
        const gestantes = sum(res, r => r.has_pregnant)
        const pcd = sum(res, r => r.has_disabled)
        const precisaBarco = sum(res, r => r.evacuation_logistics === 'boat')
        const precisaCaminhao = sum(res, r => r.needs_truck || r.evacuation_logistics === 'truck')
        return { bairro, total, idosos, acamados, dependeO2, precisaEvac, pets, criancas, gestantes, pcd, precisaBarco, precisaCaminhao }
      })
      .sort((a, b) => b.total - a.total)

    const totals = {
      total: rows.reduce((s, r) => s + r.total, 0),
      idosos: rows.reduce((s, r) => s + r.idosos, 0),
      acamados: rows.reduce((s, r) => s + r.acamados, 0),
      dependeO2: rows.reduce((s, r) => s + r.dependeO2, 0),
      precisaEvac: rows.reduce((s, r) => s + r.precisaEvac, 0),
      pets: rows.reduce((s, r) => s + r.pets, 0),
      criancas: rows.reduce((s, r) => s + r.criancas, 0),
      gestantes: rows.reduce((s, r) => s + r.gestantes, 0),
      pcd: rows.reduce((s, r) => s + r.pcd, 0),
    }

    return { rows, totals }
  }, [residences, currentLevel])

  if (residences.length === 0) return null

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Dashboard de Vulnerabilidade por Bairro</h2>
          <p className="text-sm text-slate-400">{residences.length} residências cadastradas — dados agregados por bairro</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Residências', value: stats.totals.total, color: 'text-blue-400' },
          { label: 'Idosos', value: stats.totals.idosos, color: 'text-amber-400' },
          { label: 'Acamados', value: stats.totals.acamados, color: 'text-red-400' },
          { label: 'Dependentes O₂', value: stats.totals.dependeO2, color: 'text-purple-400' },
          { label: 'Precisa Evacuação', value: stats.totals.precisaEvac, color: 'text-orange-400' },
          { label: 'Pets', value: stats.totals.pets, color: 'text-emerald-400' },
          { label: 'Crianças', value: stats.totals.criancas, color: 'text-sky-400' },
          { label: 'Gestantes', value: stats.totals.gestantes, color: 'text-pink-400' },
          { label: 'PCD', value: stats.totals.pcd, color: 'text-teal-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800/50">
            <tr className="text-left text-xs text-slate-500 uppercase">
              <th className="px-3 py-2 font-semibold">Bairro</th>
              <th className="px-3 py-2 font-semibold text-right">Resid.</th>
              <th className="px-3 py-2 font-semibold text-right">Idosos</th>
              <th className="px-3 py-2 font-semibold text-right">Acam.</th>
              <th className="px-3 py-2 font-semibold text-right">O₂</th>
              <th className="px-3 py-2 font-semibold text-right">Crian.</th>
              <th className="px-3 py-2 font-semibold text-right">Gest.</th>
              <th className="px-3 py-2 font-semibold text-right">PCD</th>
              <th className="px-3 py-2 font-semibold text-right">Pets</th>
              <th className="px-3 py-2 font-semibold text-right">Evac.</th>
              <th className="px-3 py-2 font-semibold text-right">Barco</th>
              <th className="px-3 py-2 font-semibold text-right">Caminhão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {stats.rows.map(row => (
              <tr key={row.bairro} className="hover:bg-slate-800/40 transition-colors">
                <td className="px-3 py-2 font-semibold text-slate-100">{row.bairro}</td>
                <td className="px-3 py-2 text-right text-slate-200 font-medium">{row.total}</td>
                <td className="px-3 py-2 text-right text-amber-400">{row.idosos}</td>
                <td className="px-3 py-2 text-right text-red-400">{row.acamados}</td>
                <td className="px-3 py-2 text-right text-purple-400">{row.dependeO2}</td>
                <td className="px-3 py-2 text-right text-sky-400">{row.criancas}</td>
                <td className="px-3 py-2 text-right text-pink-400">{row.gestantes}</td>
                <td className="px-3 py-2 text-right text-teal-400">{row.pcd}</td>
                <td className="px-3 py-2 text-right text-emerald-400">{row.pets}</td>
                <td className={`px-3 py-2 text-right font-medium ${row.precisaEvac > 0 ? 'text-orange-400' : 'text-slate-500'}`}>{row.precisaEvac}</td>
                <td className={`px-3 py-2 text-right ${row.precisaBarco > 0 ? 'text-blue-400' : 'text-slate-500'}`}>{row.precisaBarco}</td>
                <td className={`px-3 py-2 text-right ${row.precisaCaminhao > 0 ? 'text-amber-400' : 'text-slate-500'}`}>{row.precisaCaminhao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
