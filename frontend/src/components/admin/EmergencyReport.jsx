import { useState, useMemo } from 'react'

function sum(arr, fn) { return arr.reduce((s, r) => s + (fn(r) ? 1 : 0), 0) }
function sumVal(arr, fn) { return arr.reduce((s, r) => s + (fn(r) || 0), 0) }

function formatDate() {
  return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'long', timeStyle: 'short' })
}

export default function EmergencyReport({ residences, riverLevel, currentLevel }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const report = useMemo(() => {
    const affected = residences.filter(r => r.flood_level != null && r.flood_level <= currentLevel)
    const total = affected.length

    const evacFamilies = sum(affected, r => r.needs_evacuation_help)
    const needsTruck = sum(affected, r => r.needs_truck || r.evacuation_logistics === 'truck')
    const needsBoat = sum(affected, r => r.evacuation_logistics === 'boat')
    const needsShelter = sum(affected, r => r.shelter_plan === 'public_shelter' || r.shelter_destination === 'abrigo_publico')

    const saudePrioritaria = sum(affected, r => r.comorbidade_oxigenio || r.comorbidade_mobilidade || r.comorbidade_quimioterapia)
    const dependentesO2 = sum(affected, r => r.comorbidade_oxigenio)
    const acamados = sum(affected, r => r.comorbidade_mobilidade)
    const idosos = sum(affected, r => r.has_elderly)

    const byBairro = {}
    for (const r of affected) {
      const b = r.neighborhood || 'Sem bairro'
      if (!byBairro[b]) byBairro[b] = { total: 0, evac: 0, saude: 0, truck: 0, boat: 0 }
      byBairro[b].total++
      if (r.needs_evacuation_help) byBairro[b].evac++
      if (r.comorbidade_oxigenio || r.comorbidade_mobilidade) byBairro[b].saude++
      if (r.needs_truck || r.evacuation_logistics === 'truck') byBairro[b].truck++
      if (r.evacuation_logistics === 'boat') byBairro[b].boat++
    }

    const bairrosPrioridade = Object.entries(byBairro)
      .sort((a, b) => (b[1].evac + b[1].saude) - (a[1].evac + a[1].saude))
      .slice(0, 5)

    const texto = [
      `=== PLANO DE AÇÃO — GEOJERONIMO ===`,
      `Gerado em: ${formatDate()}`,
      `Nível do Jacuí: ${riverLevel != null ? riverLevel.toFixed(2) + 'm' : currentLevel.toFixed(1) + 'm (nível de simulação)'}`,
      `Residências afetadas: ${total}`,
      `Moradores afetados: ${affected.reduce((s, r) => s + (r.residents || 0), 0)}`,
      ``,
      `=== PRIORIDADE POR BAIRRO ===`,
      ...bairrosPrioridade.map(([b, d], i) =>
        `${i + 1}. ${b} — ${d.total} residências, ${d.evac} precisam evacuação, ${d.saude} saúde prioritária`
      ),
      ``,
      `=== EVACUAÇÃO ===`,
      `Famílias que precisam evacuação: ${evacFamilies}`,
      `Necessitam caminhão: ${needsTruck}`,
      `Necessitam barco: ${needsBoat}`,
      `Precisam de abrigo público: ${needsShelter}`,
      ``,
      `=== SAÚDE PRIORITÁRIA ===`,
      `Total saúde prioritária: ${saudePrioritaria}`,
      `Dependentes de O₂: ${dependentesO2}`,
      `Acamados: ${acamados}`,
      `Idosos: ${idosos}`,
      ``,
      `=== PETS ===`,
      `Residências com pets: ${sum(affected, r => {
        try { return JSON.parse(r.pets_info || '[]').length > 0 } catch { return !!r.pets }
      })}`,
      ``,
      `=== RECOMENDAÇÕES ===`,
      `1. Notificar sirenes nos bairros: ${bairrosPrioridade.map(([b]) => b).join(', ')}`,
      `2. Mobilizar frota de veículos para evacuação`,
      `3. Acionar abrigos municipais`,
      `4. Preparar equipe de saúde para atendimento prioritário`,
      `5. Contactar responsáveis por dependentes de O₂`,
    ].join('\n')

    return { texto, total, evacFamilies, needsTruck, needsBoat, needsShelter, saudePrioritaria, bairrosPrioridade, affected }
  }, [residences, riverLevel, currentLevel])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report.texto)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  if (residences.length === 0) return null

  return (
    <div className="bg-slate-900 rounded-xl border border-emerald-500/20 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Relatório de Emergência</h2>
          <p className="text-sm text-slate-400">Plano de ação baseado no nível atual de simulação ({currentLevel.toFixed(1)}m)</p>
        </div>
        <button onClick={() => setOpen(!open)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20 text-sm flex items-center gap-2"
        >
          {open ? 'Fechar' : '⚡ Gerar Plano de Ação'}
        </button>
      </div>

      {open && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-emerald-500/10 rounded-xl p-3 text-center border border-emerald-500/20">
              <div className="text-2xl font-bold text-emerald-400">{report.total}</div>
              <div className="text-xs text-slate-400">Residências Afetadas</div>
            </div>
            <div className="bg-orange-500/10 rounded-xl p-3 text-center border border-orange-500/20">
              <div className="text-2xl font-bold text-orange-400">{report.evacFamilies}</div>
              <div className="text-xs text-slate-400">Precisam Evacuação</div>
            </div>
            <div className="bg-amber-500/10 rounded-xl p-3 text-center border border-amber-500/20">
              <div className="text-2xl font-bold text-amber-400">{report.needsTruck}</div>
              <div className="text-xs text-slate-400">Necessitam Caminhão</div>
            </div>
            <div className="bg-blue-500/10 rounded-xl p-3 text-center border border-blue-500/20">
              <div className="text-2xl font-bold text-blue-400">{report.needsBoat}</div>
              <div className="text-xs text-slate-400">Necessitam Barco</div>
            </div>
            <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
              <div className="text-2xl font-bold text-red-400">{report.saudePrioritaria}</div>
              <div className="text-xs text-slate-400">Saúde Prioritária</div>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-xl p-4">
            <h3 className="text-sm font-bold text-slate-200 mb-3">🏘️ Bairros com maior prioridade</h3>
            <div className="space-y-2">
              {report.bairrosPrioridade.map(([bairro, dados], i) => (
                <div key={bairro} className="flex items-center gap-3 bg-slate-800/80 rounded-xl px-4 py-2.5">
                  <span className="text-xs font-bold text-slate-500 w-5">#{i + 1}</span>
                  <span className="flex-1 font-semibold text-slate-100">{bairro}</span>
                  <span className="text-xs text-slate-400">{dados.total} residências</span>
                  <span className="text-xs text-orange-400">{dados.evac} evac</span>
                  <span className="text-xs text-red-400">{dados.saude} saúde</span>
                  <span className="text-xs text-amber-400">{dados.truck} caminhão</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-200">📋 Relatório completo</h3>
              <button onClick={handleCopy} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-xs text-slate-200 rounded-xl transition-all">
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono bg-slate-900/50 rounded-xl p-3 max-h-80 overflow-y-auto">{report.texto}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
