import { useState } from 'react'
import api from '../services/api'

export default function RiskLookup() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (address.trim().length < 3) {
      setError('Digite pelo menos 3 caracteres do endereço')
      return
    }
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const res = await api.get('/public/risk-lookup', { params: { address: address.trim() } })
      setResult(res.data)
    } catch {
      setError('Não foi possível consultar agora. Tente novamente em alguns minutos.')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 mb-2 tracking-tight">Consulte seu Endereço</h1>
        <p className="text-slate-400">
          Digite sua rua para saber a partir de que nível o Rio Jacuí atinge sua residência. Não é preciso login,
          e essa consulta não mostra dados pessoais ou de saúde de ninguém.
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
        <label className="block text-sm font-medium text-slate-300" htmlFor="risk-address">
          Endereço (rua e, se souber, o número)
        </label>
        <input
          id="risk-address"
          type="text"
          value={address}
          onChange={e => setAddress(e.target.value)}
          placeholder="Ex: Rua Doutor José Athanásio, 123"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 text-white py-3 rounded-xl hover:bg-primary-500 disabled:opacity-50 font-semibold transition-all shadow-lg shadow-primary-600/20"
        >
          {loading ? 'Consultando...' : 'Consultar'}
        </button>
      </form>

      {result && (
        <div className={`rounded-2xl border p-6 ${
          result.found ? 'bg-emerald-500/10 border-emerald-500/30' : result.estimate ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-800/50 border-slate-700'
        }`}>
          {result.found && (
            <p className="text-xs uppercase tracking-wide text-emerald-400 font-semibold mb-2">Endereço cadastrado</p>
          )}
          {result.estimate && (
            <p className="text-xs uppercase tracking-wide text-amber-400 font-semibold mb-2">Estimativa pela rua</p>
          )}
          {result.ambiguous && (
            <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">Endereço ambíguo</p>
          )}
          <p className="text-slate-100">{result.message}</p>
        </div>
      )}
    </div>
  )
}
