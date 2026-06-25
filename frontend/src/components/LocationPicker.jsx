import { useEffect, useRef, useCallback } from 'react'
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

  const handleMarkerChange = useCallback(async (lng, lat) => {
    const addr = await reverseGeocode(lat, lng)
    onPositionChange({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)), address: addr })
  }, [onPositionChange])

  const placeMarker = useCallback((map, lng, lat) => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    } else {
      const el = document.createElement('div')
      el.className = 'w-6 h-6 rounded-full bg-red-500 border-2 border-white shadow-lg cursor-pointer'
      markerRef.current = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLngLat()
        handleMarkerChange(p.lng, p.lat)
      })
    }
  }, [handleMarkerChange])

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return
    const container = containerRef.current
    if (container.offsetWidth === 0 || container.offsetHeight === 0) return

    const map = new maplibregl.Map({
      container,
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

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat
      placeMarker(map, lng, lat)
      handleMarkerChange(lng, lat)
    })

    mapRef.current = map

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize()
    })
    ro.observe(container)
    return () => {
      ro.disconnect()
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }
    }
  }, [placeMarker, handleMarkerChange])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    placeMarker(map, position.lng, position.lat)
  }, [position, placeMarker])

  return (
    <div>
      <p className="text-sm text-slate-300 mb-2">Clique no mapa para marcar sua residência</p>
      <div ref={containerRef} className="w-full h-[350px] rounded-xl border border-slate-700 overflow-hidden" />
    </div>
  )
}
