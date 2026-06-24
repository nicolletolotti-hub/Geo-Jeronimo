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

      map.on('click', async (e) => {
        const { lng, lat } = e.lngLat
        const address = await reverseGeocode(lat, lng)
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat])
        } else {
          markerRef.current = new maplibregl.Marker({ draggable: true })
            .setLngLat([lng, lat])
            .addTo(map)
          markerRef.current.on('dragend', async () => {
            const pos = markerRef.current.getLngLat()
            const addr = await reverseGeocode(pos.lat, pos.lng)
            onPositionChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)), address: addr })
          })
        }
        onPositionChange({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)), address })
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
    if (!mapRef.current) return
    if (position) {
      if (markerRef.current) {
        markerRef.current.setLngLat([position.lng, position.lat])
      } else {
        markerRef.current = new maplibregl.Marker({ draggable: true })
          .setLngLat([position.lng, position.lat])
          .addTo(mapRef.current)
        markerRef.current.on('dragend', async () => {
          const pos = markerRef.current.getLngLat()
          const addr = await reverseGeocode(pos.lat, pos.lng)
          onPositionChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)), address: addr })
        })
      }
      mapRef.current.flyTo({ center: [position.lng, position.lat], zoom: 16 })
    }
  }, [position, onPositionChange])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-300">
        Posicione sua resid├¬ncia no mapa <span className="text-xs text-slate-500">(clique no mapa para marcar)</span>
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
