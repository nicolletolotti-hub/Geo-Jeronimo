import { useState, useEffect } from 'react'
import { cacheGetAll, getPendingActions } from '../services/offlineDB'

export default function ConnectionStatus({ isOnline, lastSync }) {
  const [cachedKeys, setCachedKeys] = useState(0)
  const [pending, setPending] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const load = async () => {
      const entries = await cacheGetAll()
      setCachedKeys(entries.filter(e => e.key).length)
      const p = await getPendingActions()
      setPending(p.length)
    }
    load()
    const iv = setInterval(load, 15000)
    return () => clearInterval(iv)
  }, [])

  return (
    <button onClick={() => setExpanded(!expanded)}
      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors hover:bg-slate-800/60 text-slate-500 hover:text-slate-300"
      title="Status da conexão">
      <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
      {lastSync && <span className="hidden lg:inline text-slate-600">· {lastSync}</span>}
      {cachedKeys > 0 && <span className="text-slate-600" title="Dados em cache">· {cachedKeys} em cache</span>}
      {pending > 0 && <span className="text-amber-400 font-bold">· {pending} pendente{ pending > 1 ? 's' : '' }</span>}
    </button>
  )
}
