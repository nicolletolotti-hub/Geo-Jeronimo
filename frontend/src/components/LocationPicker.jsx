import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const geocodeCache = new Map()
let geocodeLastCall = 0

async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`
  const cached = geocodeCache.get(key)
  if (cached) return cached

  const now = Date.now()
  const wait = Math.max(0, 1100 - (now - geocodeLastCall))
  if (wait > 0) await new Promise(r => setTimeout(r, wait))

  geocodeLastCall = Date.now()
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt`,
      { headers: { 'User-Agent': 'GeoJeronimo/1.0' } }
    )
    if (!resp.ok) { geocodeCache.set(key, ''); return '' }
    const data = await resp.json()
    const addr = data.address || {}
    const address = addr.road || addr.pedestrian || addr.street || ''
    geocodeCache.set(key, address)
    return address
  } catch {
    geocodeCache.set(key, '')
    return ''
  }
}

export default function LocationPicker({ position, onPositionChange }) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onPositionChange)

  useEffect(() => { onChangeRef.current = onPositionChange }, [onPositionChange])

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

    const onMarkerChange = async (lng, lat) => {
      const address = await reverseGeocode(lat, lng)
      onChangeRef.current?.({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)), address })
    }

    const placeMarker = (lng, lat) => {
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
          onMarkerChange(p.lng, p.lat)
        })
      }
    }

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat
      placeMarker(lng, lat)
      onMarkerChange(lng, lat)
    })

    mapRef.current = map

    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize()
    })
    ro.observe(container)
    return () => {
      ro.disconnect()
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !position) return
    if (markerRef.current) {
      markerRef.current.setLngLat([position.lng, position.lat])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lng, position?.lat])

  return (
    <div>
      <p className="text-sm text-slate-300 mb-2">Clique no mapa para marcar sua residência</p>
      <div ref={containerRef} className="w-full h-[350px] rounded-xl border border-slate-700 overflow-hidden" />
    </div>
  )
}
