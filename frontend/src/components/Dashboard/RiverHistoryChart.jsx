export default function RiverHistoryChart({ data }) {
  const historyData = Array.isArray(data) ? data : data?.data || []
  const statistics = !Array.isArray(data) ? data?.statistics : null

  if (!historyData || historyData.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 bg-slate-800/50 rounded-xl">
        <p className="text-lg font-medium">Nenhum dado de histórico disponível</p>
      </div>
    )
  }

  const maxLevel = Math.max(...historyData.map(d => d.level))
  const minLevel = Math.min(...historyData.map(d => d.level))
  const range = maxLevel - minLevel || 1

  const points = historyData.map((d, i) => {
    const x = (i / (historyData.length - 1)) * 100
    const y = 100 - ((d.level - minLevel) / range) * 80 - 10
    return `${x},${y}`
  }).join(' ')

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="relative">
      {statistics?.average != null && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400 font-medium">Média</div>
            <div className="text-xl font-bold text-primary-400">{Number(statistics.average).toFixed(2)}m</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400 font-medium">Mínimo</div>
            <div className="text-xl font-bold text-emerald-400">{Number(statistics.minimum).toFixed(2)}m</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400 font-medium">Máximo</div>
            <div className="text-xl font-bold text-red-400">{Number(statistics.maximum).toFixed(2)}m</div>
          </div>
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <div className="text-xs text-slate-400 font-medium">Variação</div>
            <div className="text-xl font-bold text-amber-400">
              {(statistics.change ?? 0) >= 0 ? '+' : ''}{Number(statistics.change ?? 0).toFixed(2)}m
              <span className="text-xs text-slate-500 ml-1">({statistics.changePercent ?? 0}%)</span>
            </div>
          </div>
        </div>
      )}

      <svg viewBox="0 0 100 100" className="w-full h-80" role="img" aria-label="Gráfico do nível do rio">
        {[0, 25, 50, 75, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#334155" strokeWidth="0.5" />
        ))}

        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        <polyline fill="none" stroke="url(#lineGradient)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />

        <polygon fill="url(#lineGradient)" fillOpacity="0.1" points={`0,100 ${points} 100,100`} />

        {historyData.map((d, i) => {
          const x = (i / (historyData.length - 1)) * 100
          const y = 100 - ((d.level - minLevel) / range) * 80 - 10
          return (
            <circle key={i} cx={x} cy={y} r="3" fill="#0ea5e9" className="hover:r-4 transition-all cursor-pointer">
              <title>{formatTime(d.timestamp)}: {Number(d.level).toFixed(2)}m</title>
            </circle>
          )
        })}
      </svg>

      <div className="flex justify-between mt-4 text-sm font-medium text-slate-500">
        {historyData.length <= 8 ? (
          historyData.map((d, i) => <span key={i}>{formatTime(d.timestamp)}</span>)
        ) : (
          <>
            <span>{formatTime(historyData[0].timestamp)}</span>
            <span>{formatTime(historyData[Math.floor(historyData.length / 2)].timestamp)}</span>
            <span>{formatTime(historyData[historyData.length - 1].timestamp)}</span>
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"></div>
          <span className="font-medium text-slate-300">Nível do rio (m)</span>
        </div>
        <div className="flex items-center gap-4 text-slate-500">
          <span className="font-semibold">Mín: {Number(minLevel).toFixed(2)}m</span>
          <span className="text-slate-700">|</span>
          <span className="font-semibold">Máx: {Number(maxLevel).toFixed(2)}m</span>
        </div>
        {statistics?.readings != null && (
          <>
            <span className="text-slate-700">|</span>
            <span className="font-semibold">Leituras: {statistics.readings}</span>
          </>
        )}
        {statistics?.period && (
          <>
            <span className="text-slate-700">|</span>
            <span className="font-semibold">Período: {statistics.period}</span>
          </>
        )}
      </div>
    </div>
  )
}
