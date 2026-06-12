import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

export default function LocationPicker({ position, onPositionChange }) {
  const mapRef = useRef(null)
  const containerRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    if (mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [-29.965, -51.723],
      zoom: 14,
      zoomControl: true,
      attributionControl: false,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (e) => {
      const { lat, lng } = e.latlng
      if (markerRef.current) map.removeLayer(markerRef.current)
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng()
        onPositionChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })
      })
      onPositionChange({ lat: parseFloat(lat.toFixed(6)), lng: parseFloat(lng.toFixed(6)) })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [onPositionChange])

  useEffect(() => {
    if (!mapRef.current) return
    if (markerRef.current) mapRef.current.removeLayer(markerRef.current)
    if (position) {
      markerRef.current = L.marker([position.lat, position.lng], { draggable: true }).addTo(mapRef.current)
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current.getLatLng()
        onPositionChange({ lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })
      })
      mapRef.current.setView([position.lat, position.lng], 16)
    }
  }, [position, onPositionChange])

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
