import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const homeIcon = L.divIcon({
  html: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0ea5e9" stroke="#0284c7" stroke-width="1.5" width="32" height="32"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>',
  className: '', iconSize: [32, 32], iconAnchor: [16, 16],
})

export default function ResidenceFloodMap({ residence, riverLevel }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const floodCircleRef = useRef(null)
  const alertCircleRef = useRef(null)

  const position = [residence.latitude, residence.longitude]
  const floodLevel = residence.flood_level || residence.floodLevel
  const evacuationLevel = residence.evacuation_level || residence.evacuationLevel

  useEffect(() => {
    if (mapRef.current) return
    const map = L.map(containerRef.current, {
      center: position, zoom: 15, zoomControl: false, scrollWheelZoom: true,
    })
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri', maxZoom: 19,
    }).addTo(map)

    markerRef.current = L.marker(position, { icon: homeIcon }).addTo(map)
      .bindPopup(`<b>${residence.address || 'Residência'}</b><br/>${residence.neighborhood || ''}`)

    if (evacuationLevel) {
      alertCircleRef.current = L.circle(position, {
        radius: 60, color: '#f97316', fillColor: '#f97316',
        fillOpacity: 0.06, weight: 1.5, dashArray: '4, 4',
      }).addTo(map).bindPopup(`Alerta em ${evacuationLevel}m — prepare-se para sair`)
    }

    if (floodLevel) {
      floodCircleRef.current = L.circle(position, {
        radius: 30, color: '#3b82f6', fillColor: '#3b82f6',
        fillOpacity: 0.1, weight: 2,
      }).addTo(map).bindPopup(`Inundação em ${floodLevel}m — água chega na residência`)
    }

    mapRef.current = map
    setTimeout(() => map.invalidateSize(), 300)

    return () => { map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (mapRef.current) mapRef.current.invalidateSize()
  }, [residence])

  const progress = !riverLevel?.current || !floodLevel ? 0
    : Math.min(100, (riverLevel.current / floodLevel) * 100)

  const getStatus = () => {
    if (!riverLevel?.current || !floodLevel) return { label: 'Sem dados', color: 'text-slate-400', bg: 'bg-slate-500/10' }
    if (riverLevel.current >= floodLevel) return { label: 'INUNDADO', color: 'text-red-400', bg: 'bg-red-500/10' }
    if (evacuationLevel && riverLevel.current >= evacuationLevel) return { label: 'ALERTA', color: 'text-amber-400', bg: 'bg-amber-500/10' }
    if (riverLevel.current >= floodLevel * 0.7) return { label: 'ATENÇÃO', color: 'text-yellow-400', bg: 'bg-yellow-500/10' }
    return { label: 'SEGURO', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
  }

  const status = getStatus()

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-lg font-bold text-slate-100">Mapa de Inundação da Residência</h3>
      </div>
      <div ref={containerRef} className="h-[300px] w-full" />

      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`${status.bg} ${status.color} px-3 py-1.5 rounded-lg font-bold text-sm`}>
            {status.label}
          </div>
          {riverLevel?.current != null && (
            <span className="text-sm text-slate-400">
              Rio agora: <span className="font-bold text-slate-200">{riverLevel.current.toFixed(2)}m</span>
            </span>
          )}
        </div>

        <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
          <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: progress >= 100 ? 'linear-gradient(90deg, #f97316, #ef4444)'
                : progress >= 70 ? 'linear-gradient(90deg, #22c55e, #f97316)'
                : 'linear-gradient(90deg, #22c55e, #3b82f6)',
            }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500">
          <span>0m</span>
          {evacuationLevel && <span className="text-amber-400 font-medium">Alerta {evacuationLevel}m</span>}
          {floodLevel && <span className="text-blue-400 font-medium">Inundação {floodLevel}m</span>}
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Inundação na residência</p>
            <p className="text-lg font-bold text-blue-400">{floodLevel ? `${floodLevel}m` : '—'}</p>
          </div>
          <div className="bg-slate-800 p-3 rounded-xl border border-amber-500/20">
            <p className="text-xs text-slate-400 mb-1">Alerta de evacuação</p>
            <p className="text-lg font-bold text-amber-400">{evacuationLevel ? `${evacuationLevel}m` : '—'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
