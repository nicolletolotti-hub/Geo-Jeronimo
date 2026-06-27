import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function TendenciaRio() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const fetchTrend = async () => {
      try {
        setLoading(true)
        const resp = await api.get('/river/trend')
        setData(resp.data)
        setError(null)
      } catch (err) {
        setError(err.response?.data?.error || 'Erro ao carregar tendência')
      } finally {
        setLoading(false)
      }
    }
    fetchTrend()
    const interval = setInterval(fetchTrend, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-5 bg-slate-800 rounded w-64" />
          <div className="h-20 bg-slate-800 rounded" />
          <div className="h-32 bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-2">Previsão de Tendência do Jacuí</h3>
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm">
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const trendIcon = data.trend === 'rising' ? '↑' : data.trend === 'falling' ? '↓' : '→'
  const trendLabel = data.trend === 'rising' ? 'Subindo' : data.trend === 'falling' ? 'Descendo' : 'Estável'
  const trendColor = data.trend === 'rising' ? 'text-red-400' : data.trend === 'falling' ? 'text-emerald-400' : 'text-slate-400'
  const trendBg = data.trend === 'rising' ? 'bg-red-500/10' : data.trend === 'falling' ? 'bg-emerald-500/10' : 'bg-slate-700/30'

  const projectionsFlat = data.projections.every(p => p.level === data.currentLevel)
  const insufficientData = projectionsFlat && (data.confidence === 'low' || (data.message || '').includes('insuficientes'))
  const hasProjection = !projectionsFlat && data.projections.length > 0

  let localEstimate = false
  let localProjections = []

  if (insufficientData || (!hasProjection && data.projections.length > 0)) {
    localEstimate = true
    let localRate = data.rateCmh || 0
    if (localRate === 0) {
      if (data.trend === 'rising') localRate = 1.5
      else if (data.trend === 'falling') localRate = -1.5
    }
    const sign = localRate >= 0 ? '+' : ''
    localProjections = data.projections.map(p => {
      const dampening = 1 / (1 + p.hours * 0.04)
      const delta = (localRate / 100) * p.hours * dampening
      return { ...p, level: data.currentLevel + delta, isLocal: true }
    })
  }

  const effectiveProjections = localEstimate ? localProjections : data.projections
  const showProjection = effectiveProjections.length > 0 && !effectiveProjections.every(p => p.level === data.currentLevel)

  const projectionDots = showProjection ? [
    { label: 'Agora', hours: 0, level: data.currentLevel, isLocal: false },
    ...effectiveProjections.map(p => ({ label: `+${p.hours}h`, hours: p.hours, level: p.level, isLocal: p.isLocal })),
  ] : []

  const maxChartLevel = showProjection ? Math.max(data.currentLevel, ...effectiveProjections.map(p => p.level)) * 1.15 : 1
  const minChartLevel = Math.min(0, showProjection ? Math.min(data.currentLevel, ...effectiveProjections.map(p => p.level)) * 0.85 : 0)
  const chartW = 280
  const chartH = 100
  const padL = 30
  const padR = 10
  const padT = 8
  const padB = 18
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  const xPos = (h) => padL + (h / 24) * plotW
  const yPos = (v) => padT + plotH - ((v - minChartLevel) / (maxChartLevel - minChartLevel)) * plotH

  const pts = projectionDots.map(d => `${xPos(d.hours)},${yPos(d.level)}`).join(' ')
  const areaPts = `${xPos(0)},${yPos(0)} ${pts} ${xPos(24)},${yPos(0)}`

  const yTicks = []
  const tickCount = 4
  for (let i = 0; i <= tickCount; i++) {
    const val = minChartLevel + (maxChartLevel - minChartLevel) * (i / tickCount)
    yTicks.push(Math.round(val * 10) / 10)
  }

  const formatTime = (ts) => {
    try { return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
    catch { return '--:--' }
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Previsão de Tendência do Jacuí</h3>
          <p className="text-xs text-slate-500 mt-0.5">Evolução provável do nível do rio com base nos dados recentes</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${data.classificationBg || 'bg-slate-700/30'} ${data.classificationColor || 'text-slate-400'} border border-current/20`}>
          {data.classificationLabel || data.classification?.toUpperCase() || 'NORMAL'}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Nível Atual</div>
          <div className="text-2xl font-black text-white tabular-nums">{data.currentLevel.toFixed(2)}<span className="text-sm text-slate-400 font-medium">m</span></div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Atualizado</div>
          <div className="text-lg font-bold text-white tabular-nums">{formatTime(data.timestamp)}</div>
        </div>
        <div className={`bg-slate-800/60 rounded-xl p-3 ${trendBg}`}>
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Tendência</div>
          <div className={`text-lg font-bold ${trendColor} tabular-nums`}>{trendIcon} {trendLabel}</div>
        </div>
        <div className="bg-slate-800/60 rounded-xl p-3">
          <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Velocidade</div>
          <div className="text-lg font-bold text-white tabular-nums">{data.rateCmh}<span className="text-xs text-slate-400 font-medium"> cm/h</span></div>
        </div>
      </div>

      {showProjection ? (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-bold text-slate-300">Projeção para as próximas horas</div>
            {localEstimate && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20 font-medium">
                Estimativa local
              </span>
            )}
          </div>
          <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto max-h-28">
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
            </defs>
            {yTicks.map((val, i) => (
              <line key={i} x1={padL} y1={yPos(val)} x2={chartW - padR} y2={yPos(val)}
                stroke="#1e293b" strokeWidth="0.5" strokeDasharray="3,3" />
            ))}
            {yTicks.map((val, i) => (
              <text key={i} x={padL - 4} y={yPos(val) + 3} textAnchor="end"
                className="fill-slate-600" fontSize="8">{val.toFixed(1)}</text>
            ))}
            <polygon points={areaPts} fill="url(#areaGrad)" />
            <polyline points={pts} fill="none" stroke="url(#lineGrad)" strokeWidth="1.5" strokeLinejoin="round" />
            {projectionDots.map((d, i) => (
              <circle key={i} cx={xPos(d.hours)} cy={yPos(d.level)} r="3" fill={i === 0 ? '#6366f1' : '#3b82f6'} stroke="#0f172a" strokeWidth="1" />
            ))}
            {projectionDots.filter((_, i) => i > 0).map((d, i) => (
              <text key={i} x={xPos(d.hours)} y={chartH - 2} textAnchor="middle"
                className="fill-slate-500" fontSize="7">{`+${d.hours}h`}</text>
            ))}
          </svg>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {projectionDots.map((p, i) => (
              <div key={i} className={`text-center p-2 rounded-xl ${i === 0 ? 'bg-indigo-500/10 border border-indigo-500/20' : p.isLocal ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-700/30'}`}>
                <div className="text-[9px] text-slate-500 font-medium">{p.label}</div>
                <div className={`text-sm font-bold ${i === 0 ? 'text-indigo-400' : p.isLocal ? 'text-amber-400' : 'text-blue-400'} tabular-nums`}>
                  {p.level.toFixed(2)}m
                </div>
              </div>
            ))}
          </div>
          {localEstimate && (
            <p className="text-[10px] text-amber-500/70 mt-2 text-center">
              Estimativa calculada com base na tendência atual — não substitui dados oficiais.
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-800/40 rounded-xl p-4 border border-dashed border-slate-700/50 text-center">
          <div className="text-xs font-bold text-slate-300 mb-2">Projeção para as próximas horas</div>
          <div className="py-6">
            <div className="text-3xl mb-2 text-slate-600">📊</div>
            <p className="text-sm text-slate-500 font-medium">Coletando dados para projeção</p>
            <p className="text-xs text-slate-600 mt-1">A projeção ficará disponível após algumas horas de monitoramento contínuo.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {[6, 12, 24].map(h => (
              <div key={h} className="text-center p-2 rounded-xl bg-slate-700/20">
                <div className="text-[9px] text-slate-600 font-medium">+{h}h</div>
                <div className="text-sm font-bold text-slate-600 tabular-nums">---</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.floodWarning && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-lg flex-shrink-0" aria-hidden="true">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-400">Atenção — Projeção de Inundação</p>
            <p className="text-xs text-amber-300/80 mt-1">{data.floodWarning.message}</p>
            <p className="text-xs text-amber-300/60 mt-1">
              Verifique o painel Impacto por nível do rio acima para detalhes sobre residências e ruas afetadas neste nível.
            </p>
          </div>
        </div>
      )}

      {(data.message || localEstimate) && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 text-xs text-slate-400">
          {localEstimate
            ? 'Dados históricos insuficientes. A projeção acima é uma estimativa aproximada baseada na tendência atual do rio.'
            : data.message}
          {data.dataPoints != null && (
            <span className="text-slate-500 ml-1">({data.dataPoints} pontos de dados analisados)</span>
          )}
        </div>
      )}

      <div className="border-t border-slate-800 pt-3">
        <button onClick={() => setShowInfo(!showInfo)}
          className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors">
          <span className="font-medium">Como funciona a estimativa?</span>
          <span className={`transition-transform duration-200 ${showInfo ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {showInfo && (
          <div className="mt-3 space-y-2 text-xs text-slate-400 leading-relaxed">
            <p>O cálculo da tendência analisa o comportamento do rio nas últimas 72 horas para estimar a evolução provável do nível.</p>
            <p><strong className="text-slate-300">Taxa de variação:</strong> Calculamos a velocidade de subida ou descida em diferentes janelas de tempo (1h, 3h, 6h, 12h, 24h). Janelas mais recentes têm maior peso no resultado final.</p>
            <p><strong className="text-slate-300">Atenuação:</strong> A projeção considera que o ritmo atual não se mantém indefinidamente — há um fator de amortecimento que reduz a influência da taxa atual ao longo do tempo.</p>
            <p><strong className="text-slate-300">Chuvas nas cabeceiras:</strong> O nível do rio responde a chuvas na bacia do Jacuí com certo atraso. O modelo captura esse comportamento através da análise da curva recente do sistema.</p>
            <p><strong className="text-slate-300">Precisão:</strong> A confiabilidade da projeção aumenta com a quantidade de dados históricos disponíveis e a consistência da tendência. Em situações de mudança rápida, a previsão pode divergir da realidade.</p>
          </div>
        )}
      </div>
    </div>
  )
}
