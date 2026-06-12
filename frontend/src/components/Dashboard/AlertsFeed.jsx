export default function AlertsFeed({ alerts, statistics }) {
  const alertsData = Array.isArray(alerts) ? alerts : alerts?.alerts || []
  const alertsStats = !Array.isArray(alerts) ? alerts?.statistics : statistics

  if (!alertsData || alertsData.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12 bg-slate-800/50 rounded-xl">
        <p className="text-lg font-medium">Nenhum alerta ativo no momento</p>
        <p className="text-sm mt-2 text-slate-500">O sistema está monitorando e notificará quando necessário</p>
      </div>
    )
  }

  const getAlertStyles = (type) => {
    switch (type) {
      case 'danger':
        return 'bg-red-500/10 border-red-500/30 text-red-400 hover:border-red-500/50'
      case 'warning':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:border-amber-500/50'
      case 'info':
        return 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-500/50'
      default:
        return 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'danger': return '🚨'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return '📢'
    }
  }

  const getTypeLabel = (type) => {
    switch (type) {
      case 'danger': return 'Perigo'
      case 'warning': return 'Atenção'
      case 'info': return 'Informação'
      default: return 'Geral'
    }
  }

  return (
    <div className="space-y-4">
      {alertsStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="text-xs text-slate-400 font-medium">Total</div>
            <div className="text-xl font-bold text-slate-100">{alertsStats.total}</div>
          </div>
          {Object.entries(alertsStats.byType || {}).map(([type, count]) => (
            <div key={type} className={`p-3 rounded-lg border ${getAlertStyles(type).split(' ').slice(0, 2).join(' ')}`}>
              <div className="text-xs font-medium opacity-75">{getTypeLabel(type)}</div>
              <div className="text-xl font-bold">{count}</div>
            </div>
          ))}
        </div>
      )}

      {alertsData.map((alert) => (
        <article
          key={alert.id}
          className={`p-5 rounded-xl border ${getAlertStyles(alert.type)} transition-all duration-300`}
          role="alert"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl" aria-hidden="true">{getAlertIcon(alert.type)}</span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-slate-100">{alert.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getAlertStyles(alert.type).split(' ').slice(0, 2).join(' ')}`}>
                    {getTypeLabel(alert.type)}
                  </span>
                </div>
                <time className="text-sm font-medium text-slate-500 bg-slate-800 px-3 py-1 rounded-full">
                  {new Date(alert.created_at || alert.timestamp).toLocaleString('pt-BR')}
                </time>
              </div>
              <p className="text-base leading-relaxed text-slate-300">{alert.message}</p>
              <div className="mt-3 text-sm font-medium text-slate-500 flex items-center gap-2">
                <span>Fonte:</span>
                <span className="font-semibold text-slate-300">{alert.source}</span>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
