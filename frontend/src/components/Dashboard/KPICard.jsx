import React from 'react'

export default function KPICard({ title, value, subtitle, icon, trend, color = 'slate', onClick }) {
  const trendColors = {
    up: 'text-red-400',
    down: 'text-emerald-400',
    stable: 'text-slate-400',
  }

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all duration-200 text-left w-full"
    >
      {icon && (
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-${color}-500/20`}>
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-slate-400 mb-1">{title}</div>
        <div className="text-2xl font-bold text-white truncate">{value}</div>
        {subtitle && <div className="text-xs text-slate-400 mt-1">{subtitle}</div>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-sm font-semibold ${trendColors[trend]}`}>
          {trendIcons[trend]}
        </div>
      )}
    </button>
  )
}
