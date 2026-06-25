import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

function makeCircle(lng, lat, radiusKm, points = 32) {
  const coords = []
  for (let i = 0; i <= points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = radiusKm * Math.cos(angle)
    const dy = radiusKm * Math.sin(angle)
    const dLng = (dx / 111.32) / Math.cos(lat * Math.PI / 180)
    const dLat = dy / 111.32
    coords.push([lng + dLng, lat + dLat])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

const homeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0ea5e9" stroke="#0284c7" stroke-width="1.5" width="32" height="32"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'

function setCircleSource(map, id, data, fillColor, fillOpacity, lineColor, lineWidth, dashArray) {
  if (map.getSource(id)) {
    map.getSource(id).setData(data)
  } else {
    map.addSource(id, { type: 'geojson', data })
    map.addLayer({
      id: `${id}-fill`, type: 'fill', source: id,
      paint: { 'fill-color': fillColor, 'fill-opacity': fillOpacity },
    })
    map.addLayer({
      id: `${id}-outline`, type: 'line', source: id,
      paint: { 'line-color': lineColor, 'line-width': lineWidth, ...(dashArray ? { 'line-dasharray': dashArray } : {}) },
    })
  }
}

function removeCircleSource(map, id) {
  if (map.getLayer(`${id}-fill`)) map.removeLayer(`${id}-fill`)
  if (map.getLayer(`${id}-outline`)) map.removeLayer(`${id}-outline`)
  if (map.getSource(id)) map.removeSource(id)
}

export default function ResidenceFloodMap({ residence, riverLevel }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const centerRef = useRef({ lng: 0, lat: 0 })
  const propsRef = useRef({ evacuationLevel: null, floodLevel: null })

  const lng = residence.longitude
  const lat = residence.latitude
  const floodLevel = residence.flood_level ?? residence.floodLevel
  const evacuationLevel = residence.evacuation_level ?? residence.evacuationLevel

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          satellite: {
            type: 'raster',
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256,
            attribution: 'Tiles &copy; Esri',
          },
        },
        layers: [
          { id: 'satellite', type: 'raster', source: 'satellite', minzoom: 0, maxzoom: 19 },
        ],
      },
      center: [lng, lat],
      zoom: 15,
      attributionControl: false,
    })

    centerRef.current = { lng, lat }

    const el = document.createElement('div')
    el.innerHTML = homeSvg
    new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup().setHTML(`<b>${residence.address || 'Residência'}</b><br/>${residence.neighborhood || ''}`))
      .addTo(map)

    mapRef.current = map

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize()
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (mapRef.current) mapRef.current.resize()
  }, [residence])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const doUpdate = () => {
      propsRef.current = { evacuationLevel, floodLevel }
      const c = centerRef.current
      if (evacuationLevel) {
        setCircleSource(map, 'alert-circle', makeCircle(c.lng, c.lat, 0.06), '#f97316', 0.06, '#f97316', 1.5, [4, 4])
      } else {
        removeCircleSource(map, 'alert-circle')
      }
      if (floodLevel) {
        setCircleSource(map, 'flood-circle', makeCircle(c.lng, c.lat, 0.03), '#3b82f6', 0.1, '#3b82f6', 2, null)
      } else {
        removeCircleSource(map, 'flood-circle')
      }
    }

    if (map.isStyleLoaded()) {
      doUpdate()
    } else {
      map.once('load', doUpdate)
    }
  }, [evacuationLevel, floodLevel, lng, lat])

  const safeFloodLevel = floodLevel || 0
  const progress = !riverLevel?.current || !floodLevel ? 0
    : Math.min(100, (riverLevel.current / safeFloodLevel) * 100)

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
