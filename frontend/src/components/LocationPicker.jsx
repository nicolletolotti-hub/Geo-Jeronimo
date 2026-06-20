import { useEffect, useRef } from 'react'
import esriConfig from '@arcgis/core/config.js'
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import Graphic from '@arcgis/core/Graphic.js'
import Point from '@arcgis/core/geometry/Point.js'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'

const API_KEY = '3b13e139e77f4336bff3eefdaf04b94d'
esriConfig.apiKey = API_KEY
esriConfig.assetsPath = 'https://js.arcgis.com/4.32/@arcgis/core/assets/'

export default function LocationPicker({ position, onPositionChange }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (viewRef.current || !containerRef.current) return

    const map = new Map({
      basemap: 'arcgis/navigation',
    })

    const view = new MapView({
      container: containerRef.current,
      map,
      center: [-51.723, -29.965],
      zoom: 14,
      popup: { dockEnabled: true, dockOptions: { buttonEnabled: false } },
    })

    view.on('click', (event) => {
      const { latitude, longitude } = event.mapPoint
      const point = new Point({ longitude, latitude })
      if (markerRef.current) {
        markerRef.current.geometry = point
      } else {
        const marker = new Graphic({
          geometry: point,
          symbol: new SimpleMarkerSymbol({
            color: [239, 68, 68, 1],
            outline: { color: [255, 255, 255, 0.8], width: 2 },
            size: 14,
          }),
        })
        view.graphics.add(marker)
        markerRef.current = marker
      }
      onPositionChange({ lat: latitude, lng: longitude })
    })

    view.when(() => { viewRef.current = view })

    return () => {
      if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null }
    }
  }, [onPositionChange])

  useEffect(() => {
    if (!viewRef.current || !position) return
    const point = new Point({ longitude: position.lng, latitude: position.lat })
    if (markerRef.current) {
      markerRef.current.geometry = point
    } else {
      const marker = new Graphic({
        geometry: point,
        symbol: new SimpleMarkerSymbol({
          color: [239, 68, 68, 1],
          outline: { color: [255, 255, 255, 0.8], width: 2 },
          size: 14,
        }),
      })
      viewRef.current.graphics.add(marker)
      markerRef.current = marker
    }
    viewRef.current.goTo({ center: [position.lng, position.lat], zoom: 16 })
  }, [position])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300">
        Posicione sua residência no mapa <span className="text-xs text-slate-500">(clique no mapa para marcar)</span>
      </label>
      <div ref={containerRef} className="w-full h-[350px] rounded-xl border border-slate-700 overflow-hidden z-0" />
      {position && (
        <p className="text-xs text-slate-400">
          Coordenadas: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
    </div>
  )
}
