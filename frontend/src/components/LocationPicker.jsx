import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

async function reverseGeocode(lat, lng) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt`,
      { headers: { 'User-Agent': 'GeoJeronimo/1.0' } }
    )
    if (!resp.ok) return ''
    const data = await resp.json()
    return data.display_name || ''
  } catch {
    return ''
  }
}

export default function LocationPicker({ position, onPositionChange }) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const markerRef = useRef(null)
  const isUpdatingRef = useRef(false)

  const updateMarker = (map, lng, lat) => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      markerRef.current = new maplibregl.Marker({ draggable: true, color: '#ef4444' })
        .setLngLat([lng, lat])
        .addTo(map)
      markerRef.current.on('dragend', async () => {
        if (isUpdatingRef.current) return
        isUpdatingRef.current = true
        const pos = markerRef.current.getLngLat()
        const addr = await reverseGeocode(pos.lat, pos.lng)
        onPositionChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)), address: addr })
        isUpdatingRef.current = false
      })
    }
  }

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return

    const initMap = () => {
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '&copy; OpenStreetMap contributors',
            },
          },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [-51.723, -29.965],
        zoom: 14,
        attributionControl: false,
      })

      map.getCanvas().style.cursor = 'crosshair'

      map.on('click', async (e) => {
        if (isUpdatingRef.current) return
        isUpdatingRef.current = true
        const { lng, lat } = e.lngLat
        updateMarker(map, lng, lat)
        map.flyTo({ center: [lng, lat], zoom: 16, duration: 1000 })
        const address = await reverseGeocode(lat, lng)
        onPositionChange({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)), address })
        isUpdatingRef.current = false
      })

      mapRef.current = map
    }

    initMap()

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize()
      else initMap()
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [onPositionChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    updateMarker(map, position.lng, position.lat)
    map.flyTo({ center: [position.lng, position.lat], zoom: 16, duration: 1000 })
  }, [position])

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="w-full h-[350px] rounded-xl border border-slate-700 overflow-hidden relative">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 text-slate-200 text-xs px-3 py-1.5 rounded-full border border-slate-700 whitespace-nowrap pointer-events-none">
          Clique no mapa para marcar sua residência
        </div>
      </div>
      {position && (
        <p className="text-xs text-slate-400">
          Coordenadas: {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
        </p>
      )}
    </div>
  )
}
