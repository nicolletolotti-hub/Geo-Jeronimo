import { useState, useEffect, useRef } from 'react'

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
const SJC_BBOX = '-51.80,-30.02,-51.62,-29.88'

export default function AddressAutocomplete({ onSelect, initialValue }) {
  const [query, setQuery] = useState(initialValue || '')
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(!!initialValue)
  const containerRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (selected || query.length < 3) { setSuggestions([]); return }
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&country=br&types=address,place,locality,neighborhood&bbox=${SJC_BBOX}&limit=6&language=pt`

        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        setSuggestions(data.features || [])
        setOpen(true)
      } catch { setSuggestions([]) }
      setLoading(false)
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [query, selected])

  useEffect(() => {
    const handle = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const handleSelect = (feature) => {
    const [lng, lat] = feature.center
    const context = feature.context || []
    const neighborhood = context.find(c => c.id.startsWith('neighborhood'))?.text
      || context.find(c => c.id.startsWith('locality'))?.text
      || context.find(c => c.id.startsWith('place'))?.text
      || ''

    setQuery(feature.place_name)
    setSelected(true)
    setOpen(false)
    onSelect({
      address: feature.place_name,
      neighborhood: neighborhood !== 'São Jerônimo' ? neighborhood : '',
      latitude: lat,
      longitude: lng,
    })
  }

  const handleChange = (e) => {
    setQuery(e.target.value)
    setSelected(false)
    setSuggestions([])
  }

  const handleClear = () => {
    setQuery('')
    setSelected(false)
    setSuggestions([])
    onSelect({ address: '', neighborhood: '', latitude: null, longitude: null })
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-semibold text-slate-300 mb-2">Digite seu endereço</label>
      <div className="relative">
        <input
          type="text" value={query} onChange={handleChange}
          placeholder="Rua, número, bairro..."
          className="w-full px-4 py-3 border-2 rounded-xl bg-slate-800 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-slate-200 placeholder-slate-500 border-slate-700 hover:border-slate-600 pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !loading && (
          <button type="button" onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
          {suggestions.map((f) => (
            <li key={f.id}>
              <button type="button" onClick={() => handleSelect(f)}
                className="w-full text-left px-4 py-3 text-sm text-slate-200 hover:bg-primary-500/10 hover:text-primary-300 border-b border-slate-700 last:border-b-0 transition-colors"
              >
                <span className="block font-medium">{f.text}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{f.place_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && query && (
        <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          Endereço selecionado
        </p>
      )}
    </div>
  )
}
