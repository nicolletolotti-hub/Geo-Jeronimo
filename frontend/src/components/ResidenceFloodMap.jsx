import { useEffect, useRef } from 'react'
import esriConfig from '@arcgis/core/config.js'
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import Graphic from '@arcgis/core/Graphic.js'
import Point from '@arcgis/core/geometry/Point.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js'
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol.js'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
import PictureMarkerSymbol from '@arcgis/core/symbols/PictureMarkerSymbol.js'

const API_KEY = '3b13e139e77f4336bff3eefdaf04b94d'
esriConfig.apiKey = API_KEY
esriConfig.assetsPath = 'https://js.arcgis.com/4.32/@arcgis/core/assets/'

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
  return [coords]
}

export default function ResidenceFloodMap({ residence, riverLevel }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)

  const lng = residence.longitude
  const lat = residence.latitude
  const floodLevel = residence.flood_level || residence.floodLevel
  const evacuationLevel = residence.evacuation_level || residence.evacuationLevel

  useEffect(() => {
    if (viewRef.current || !containerRef.current) return

    const map = new Map({
      basemap: 'arcgis/imagery',
    })

    const view = new MapView({
      container: containerRef.current,
      map,
      center: [lng, lat],
      zoom: 15,
      popup: { dockEnabled: true, dockOptions: { buttonEnabled: false } },
    })

    view.when(() => {
      const layer = new GraphicsLayer()
      map.add(layer)

      // Home marker
      const homeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#0ea5e9" stroke="#0284c7" stroke-width="1.5" width="32" height="32"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>'
      const img = `data:image/svg+xml;base64,${btoa(homeSvg)}`
      const homeMarker = new Graphic({
        geometry: new Point({ longitude: lng, latitude: lat }),
        symbol: new PictureMarkerSymbol({ url: img, width: 32, height: 32 }),
        popupTemplate: { title: residence.address || 'Residência', content: residence.neighborhood || '' },
      })
      layer.add(homeMarker)

      // Alert circle
      if (evacuationLevel) {
        const coords = makeCircle(lng, lat, 0.06)
        const alertFill = new Graphic({
          geometry: new Polygon({ rings: coords, spatialReference: { wkid: 4326 } }),
          symbol: new SimpleFillSymbol({ color: [249, 115, 22, 0.06], outline: { color: [249, 115, 22], width: 1.5, style: 'dash' } }),
          popupTemplate: { title: 'Alerta', content: `Alerta em ${evacuationLevel}m — prepare-se para sair` },
        })
        layer.add(alertFill)
      }

      // Flood circle
      if (floodLevel) {
        const coords = makeCircle(lng, lat, 0.03)
        const floodFill = new Graphic({
          geometry: new Polygon({ rings: coords, spatialReference: { wkid: 4326 } }),
          symbol: new SimpleFillSymbol({ color: [59, 130, 246, 0.1], outline: { color: [59, 130, 246], width: 2 } }),
          popupTemplate: { title: 'Inundação', content: `Inundação em ${floodLevel}m — água chega na residência` },
        })
        layer.add(floodFill)
      }

      viewRef.current = view
    })

    const ro = new ResizeObserver(() => { if (viewRef.current) viewRef.current.resize() })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null }
    }
  }, [])

  useEffect(() => { if (viewRef.current) viewRef.current.resize() }, [residence])

  const progress = !riverLevel?.current || !floodLevel ? 0 : Math.min(100, (riverLevel.current / floodLevel) * 100)

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
