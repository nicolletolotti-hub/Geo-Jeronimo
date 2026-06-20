import { useState, useRef, useEffect, useMemo } from 'react'
import esriConfig from '@arcgis/core/config.js'
import Map from '@arcgis/core/Map.js'
import MapView from '@arcgis/core/views/MapView.js'
import SceneView from '@arcgis/core/views/SceneView.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import Graphic from '@arcgis/core/Graphic.js'
import Point from '@arcgis/core/geometry/Point.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import Polyline from '@arcgis/core/geometry/Polyline.js'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js'
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol.js'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
import * as turf from '@turf/turf'

const API_KEY = '3b13e139e77f4336bff3eefdaf04b94d'
esriConfig.apiKey = API_KEY
esriConfig.assetsPath = 'https://js.arcgis.com/4.32/@arcgis/core/assets/'

const BASEMAPS = { street: 'arcgis/navigation', satellite: 'arcgis/imagery', topo: 'arcgis/topographic' }
const FLOOD_COLOR = [65, 105, 225, 0.3]
const FLOOD_OUTLINE = [65, 105, 225, 0.5]
const BAIRRO_FILL = [59, 130, 246, 0.08]
const BAIRRO_OUTLINE = [100, 116, 139, 0.6, 0.8]
const BAIRRO_HIGHLIGHT = [59, 130, 246, 0.2]

function smoothFloodData(geojson, tolerance = 0.0001) {
  if (!geojson?.features) return geojson
  return { ...geojson, features: geojson.features.map(f => {
    if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
      try { return turf.simplify(f, { tolerance, highQuality: true }) } catch { return f }
    }
    return f
  }) }
}

function intersectBbox(bb1, bb2) { return bb1[0] <= bb2[2] && bb1[2] >= bb2[0] && bb1[1] <= bb2[3] && bb1[3] >= bb2[1] }
function getBbox(f) { if (!f._bbox) f._bbox = turf.bbox(f); return f._bbox }

function isStreetFlooded(streetFeature, floodData) {
  if (!floodData?.features) return false
  try {
    const streetBbox = turf.bbox(streetFeature)
    for (const ff of floodData.features) {
      if (!intersectBbox(streetBbox, getBbox(ff))) continue
      const sg = streetFeature.geometry.type === 'LineString'
        ? turf.lineString(streetFeature.geometry.coordinates)
        : turf.multiLineString(streetFeature.geometry.coordinates)
      if (turf.booleanIntersects(sg, ff)) return true
    }
    return false
  } catch { return false }
}

function ringsFromGeoJSON(geometry) {
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates[0]
  return []
}

export default function MapLibreMap({ floodData, bairrosData, ruasData, markerPosition, showRuas, show3d, onBairroSelect, selectedBairro }) {
  const containerRef = useRef(null)
  const viewRef = useRef(null)
  const floodLayerRef = useRef(null)
  const bairrosLayerRef = useRef(null)
  const ruasLayerRef = useRef(null)
  const markerRef = useRef(null)
  const orbitTimerRef = useRef(null)
  const [isOrbiting, setIsOrbiting] = useState(false)

  const processedFlood = useMemo(() => floodData ? smoothFloodData(floodData) : null, [floodData])

  useEffect(() => {
    if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null }
    if (!containerRef.current) return

    const map = new Map({
      basemap: BASEMAPS.street,
      ground: show3d ? 'world-elevation' : undefined,
    })

    const ViewConstructor = show3d ? SceneView : MapView
    const view = new ViewConstructor({
      container: containerRef.current,
      map,
      center: [-51.723, -29.965],
      zoom: 14,
      popup: { dockEnabled: true, dockOptions: { buttonEnabled: false } },
      ...(show3d ? { camera: { position: { x: -51.723, y: -29.965, z: 3000 }, tilt: 0 } } : {}),
    })

    floodLayerRef.current = new GraphicsLayer({ id: 'flood' })
    bairrosLayerRef.current = new GraphicsLayer({ id: 'bairros' })
    ruasLayerRef.current = new GraphicsLayer({ id: 'ruas' })
    map.add(floodLayerRef.current)
    map.add(bairrosLayerRef.current)
    map.add(ruasLayerRef.current)

    view.when(() => {
      viewRef.current = view
      loadAllData()
    })

    view.on('pointer-move', (event) => {
      view.hitTest(event).then(response => {
        const hit = response.results.find(r => r.graphic && r.graphic.layer === bairrosLayerRef.current)
        containerRef.current.style.cursor = hit ? 'pointer' : ''
        if (hit) {
          const attrs = hit.graphic.attributes || {}
          view.popup.open({ title: attrs.nome || 'Bairro', content: attrs.nome || '', location: event.mapPoint })
        } else {
          view.popup.close()
        }
      })
    })

    view.on('click', (event) => {
      view.hitTest(event).then(response => {
        const hit = response.results.find(r => r.graphic && r.graphic.layer === bairrosLayerRef.current)
        if (hit && hit.graphic.attributes) {
          highlightBairro(hit.graphic.attributes, bairrosLayerRef.current)
          onBairroSelect?.(hit.graphic.attributes)
        } else if (!hit?.graphic?.layer) {
          clearHighlight(bairrosLayerRef.current)
          onBairroSelect?.(null)
        }
      })
    })

    return () => { if (viewRef.current) { viewRef.current.destroy(); viewRef.current = null } }
  }, [show3d])

  function loadAllData() {
    const v = viewRef.current
    if (!v) return
    loadFlood()
    loadBairros()
    loadRuas()
    loadMarker()
    if (selectedBairro) highlightBairro(selectedBairro, bairrosLayerRef.current)
  }

  function loadFlood() {
    const layer = floodLayerRef.current
    if (!layer || !processedFlood?.features) return
    layer.removeAll()
    for (const feat of processedFlood.features) {
      try {
        const rings = ringsFromGeoJSON(feat.geometry)
        if (!rings.length) continue
        const polygon = new Polygon({ rings, spatialReference: { wkid: 4326 } })
        const graphic = new Graphic({
          geometry: polygon,
          symbol: show3d
            ? { type: 'polygon-3d', symbolLayers: [{ type: 'extrude', material: { color: [...FLOOD_COLOR] }, edges: { type: 'solid', color: [...FLOOD_OUTLINE] }, size: 0.8 }] }
            : new SimpleFillSymbol({ color: [...FLOOD_COLOR], outline: { color: [...FLOOD_OUTLINE], width: 1 } }),
        })
        layer.add(graphic)
      } catch {}
    }
  }

  function loadBairros() {
    const layer = bairrosLayerRef.current
    if (!layer || !bairrosData?.features) return
    layer.removeAll()
    for (const feat of bairrosData.features) {
      try {
        const rings = ringsFromGeoJSON(feat.geometry)
        if (!rings.length) continue
        const polygon = new Polygon({ rings, spatialReference: { wkid: 4326 } })
        const graphic = new Graphic({
          geometry: polygon,
          attributes: feat.properties || {},
          symbol: new SimpleFillSymbol({ color: [...BAIRRO_FILL], outline: { color: [...BAIRRO_OUTLINE.slice(0, 3)], width: 0.8 } }),
        })
        layer.add(graphic)
      } catch {}
    }
  }

  function loadRuas() {
    const layer = ruasLayerRef.current
    if (!layer || !showRuas || !ruasData?.features) return
    layer.removeAll()
    for (const feat of ruasData.features) {
      try {
        const isFlooded = processedFlood && isStreetFlooded(feat, processedFlood)
        const paths = feat.geometry.type === 'LineString' ? [feat.geometry.coordinates] : feat.geometry.coordinates
        const polyline = new Polyline({ paths, spatialReference: { wkid: 4326 } })
        const graphic = new Graphic({
          geometry: polyline,
          attributes: { ...feat.properties, _flooded: isFlooded },
          symbol: new SimpleLineSymbol({
            color: isFlooded ? [239, 68, 68] : [249, 115, 22],
            width: isFlooded ? 2 : 1.5,
            style: isFlooded ? 'solid' : 'dash',
          }),
        })
        layer.add(graphic)
      } catch {}
    }
  }

  function loadMarker() {
    if (!markerPosition || !viewRef.current) return
    const point = new Point({ longitude: markerPosition.lng, latitude: markerPosition.lat })
    markerRef.current = new Graphic({
      geometry: point,
      symbol: new SimpleMarkerSymbol({ color: [239, 68, 68, 1], outline: { color: [255, 255, 255, 0.8], width: 2 }, size: 14 }),
    })
    viewRef.current.graphics.add(markerRef.current)
    viewRef.current.goTo({ center: [markerPosition.lng, markerPosition.lat], zoom: 16 })
  }

  function clearMarker() {
    if (markerRef.current && viewRef.current) {
      viewRef.current.graphics.remove(markerRef.current)
      markerRef.current = null
    }
  }

  function highlightBairro(props, layer) {
    if (!layer) return
    layer.graphics.forEach(g => {
      if (g.attributes?.nome === props.nome && g.attributes?.bairro === props.bairro) {
        g.symbol = new SimpleFillSymbol({ color: [...BAIRRO_HIGHLIGHT], outline: { color: [59, 130, 246], width: 2 } })
      } else {
        g.symbol = new SimpleFillSymbol({ color: [...BAIRRO_FILL], outline: { color: [...BAIRRO_OUTLINE.slice(0, 3)], width: 0.8 } })
      }
    })
  }

  function clearHighlight(layer) {
    if (!layer) return
    layer.graphics.forEach(g => {
      g.symbol = new SimpleFillSymbol({ color: [...BAIRRO_FILL], outline: { color: [...BAIRRO_OUTLINE.slice(0, 3)], width: 0.8 } })
    })
  }

  // Data-reactive updates
  useEffect(() => {
    if (!viewRef.current || !floodLayerRef.current) return
    loadFlood()
  }, [processedFlood, show3d])

  useEffect(() => {
    if (!viewRef.current || !bairrosLayerRef.current) return
    loadBairros()
    if (selectedBairro) highlightBairro(selectedBairro, bairrosLayerRef.current)
  }, [bairrosData, selectedBairro])

  useEffect(() => {
    if (!viewRef.current || !ruasLayerRef.current) return
    loadRuas()
  }, [showRuas, ruasData, processedFlood])

  useEffect(() => {
    if (!viewRef.current) return
    clearMarker()
    loadMarker()
  }, [markerPosition])

  const handleBasemapChange = (basemap) => { if (viewRef.current) viewRef.current.map.basemap = BASEMAPS[basemap] || BASEMAPS.street }

  const handleFlyTo = () => {
    if (!viewRef.current) return
    viewRef.current.goTo({ center: [-51.723, -29.965], zoom: 14 })
  }

  const handleOrbit = () => {
    if (isOrbiting) {
      setIsOrbiting(false)
      if (orbitTimerRef.current) { clearTimeout(orbitTimerRef.current); orbitTimerRef.current = null }
      return
    }
    if (!viewRef.current || !markerPosition) return
    setIsOrbiting(true)
    let angle = 0
    const orbit = () => {
      if (!viewRef.current || !isOrbiting) return
      angle += 12
      if (angle >= 360) angle = 0
      const rad = (angle * Math.PI) / 180
      const distance = 300
      const x = markerPosition.lng + (distance / 111320) * Math.cos(rad) / Math.cos(markerPosition.lat * Math.PI / 180)
      const y = markerPosition.lat + (distance / 111320) * Math.sin(rad)
      viewRef.current.goTo({
        target: [markerPosition.lng, markerPosition.lat],
        camera: { position: { x, y, z: 200 }, heading: angle, tilt: 60 },
      }, { duration: 2500 })
      orbitTimerRef.current = setTimeout(orbit, 2600)
    }
    orbit()
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 z-10 flex gap-2">
        {Object.keys(BASEMAPS).map(key => (
          <button key={key} onClick={() => handleBasemapChange(key)}
            className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors capitalize">
            {key === 'satellite' ? 'Satélite' : key === 'topo' ? 'Topográfico' : 'Rua'}
          </button>
        ))}
      </div>

      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button onClick={handleFlyTo}
          className="bg-slate-900/80 backdrop-blur border border-slate-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors">
          📍 Centralizar
        </button>
        {show3d && markerPosition && (
          <button onClick={handleOrbit}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors backdrop-blur border ${
              isOrbiting ? 'bg-red-500/80 border-red-400 text-white' : 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'
            }`}>
            {isOrbiting ? '⏹ Parar' : '🔄 Girar 3D'}
          </button>
        )}
      </div>
    </div>
  )
}
