import { useState, useRef, useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const TERRAIN_TILES = MAPBOX_TOKEN
  ? `https://api.mapbox.com/v4/mapbox.terrain-rgb/{z}/{x}/{y}.pngraw?access_token=${MAPBOX_TOKEN}`
  : null;

const OSM_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const SATELLITE_TILES = ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'];
const TOPO_TILES = ['https://tile.opentopomap.org/{z}/{x}/{y}.png'];

const LAYER_IDS = {
  floodFill: 'flood-fill',
  floodOutline: 'flood-outline',
  bairrosFill: 'bairros-fill',
  bairrosOutline: 'bairros-outline',
  bairrosHighlight: 'bairros-highlight',
  ruasFlooded: 'ruas-flooded',
  ruasAlert: 'ruas-alert',
};

function smoothFloodData(geojson, tolerance = 0.0001) {
  if (!geojson?.features) return geojson;
  return {
    ...geojson,
    features: geojson.features.map(f => {
      if (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon') {
        try { return turf.simplify(f, { tolerance, highQuality: true }); }
        catch { return f; }
      }
      return f;
    }),
  };
}

function intersectBbox(bb1, bb2) {
  return bb1[0] <= bb2[2] && bb1[2] >= bb2[0] && bb1[1] <= bb2[3] && bb1[3] >= bb2[1];
}

function getBbox(f) {
  if (!f._bbox) f._bbox = turf.bbox(f);
  return f._bbox;
}

function isStreetFlooded(streetFeature, floodData) {
  if (!floodData?.features) return false;
  try {
    const streetBbox = turf.bbox(streetFeature);
    for (const ff of floodData.features) {
      if (!intersectBbox(streetBbox, getBbox(ff))) continue;
      const sg = streetFeature.geometry.type === 'LineString'
        ? turf.lineString(streetFeature.geometry.coordinates)
        : turf.multiLineString(streetFeature.geometry.coordinates);
      if (turf.booleanIntersects(sg, ff)) return true;
    }
    return false;
  } catch { return false; }
}

function isStreetNearFloodExact(streetFeature, floodData, floodDataNear) {
  if (!floodDataNear?.features || isStreetFlooded(streetFeature, floodData)) return false;
  try {
    const streetBbox = turf.bbox(streetFeature);
    for (const ff of floodDataNear.features) {
      if (!intersectBbox(streetBbox, getBbox(ff))) continue;
      const sg = streetFeature.geometry.type === 'LineString'
        ? turf.lineString(streetFeature.geometry.coordinates)
        : turf.multiLineString(streetFeature.geometry.coordinates);
      if (turf.booleanIntersects(sg, ff)) return true;
    }
    return false;
  } catch { return false; }
}

export default function MapLibreMap({
  initialState, selectedNeighborhood, onNeighborhoodClick,
  floodData, bairrosData, municipioData, ruasData, ruasSearch, showRuas, mapMode,
  floodDataNear,
}) {
  const [mode3d, setMode3d] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [marker, setMarker] = useState(null);
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const spinningRef = useRef(false);
  const rafRef = useRef(null);
  const prevModeRef = useRef(mapMode);
  const selectedNomeRef = useRef(null);
  const prevSelectedNomeRef = useRef(null);
  const onNeighborhoodClickRef = useRef(onNeighborhoodClick);
  const popupRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    onNeighborhoodClickRef.current = onNeighborhoodClick;
  }, [onNeighborhoodClick]);

  useEffect(() => {
    if (mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: OSM_TILES, tileSize: 256, maxzoom: 18, attribution: '© OpenStreetMap' },
          satellite: { type: 'raster', tiles: SATELLITE_TILES, tileSize: 256, maxzoom: 18, attribution: '© Esri' },
          topo: { type: 'raster', tiles: TOPO_TILES, tileSize: 256, maxzoom: 17, attribution: '© OpenTopoMap' },
        },
        layers: [
          { id: 'base-osm', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
          { id: 'base-satellite', type: 'raster', source: 'satellite', layout: { visibility: 'visible' } },
          { id: 'base-topo', type: 'raster', source: 'topo', layout: { visibility: 'none' } },
        ],
      },
      center: [initialState.lng, initialState.lat],
      zoom: initialState.zoom,
      maxZoom: 17,
      pitch: 0,
      bearing: 0,
      failIfMajorPerformanceCaveat: false,
      antialias: true,
      preserveDrawingBuffer: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      map.resize();

      const activeLayer = mapMode === 'street' ? 'base-osm' : mapMode === 'topo' ? 'base-topo' : 'base-satellite';
      for (const l of ['base-osm', 'base-satellite', 'base-topo']) {
        map.setLayoutProperty(l, 'visibility', l === activeLayer ? 'visible' : 'none');
      }

      map.addSource('bairros', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'nome' });
      map.addLayer({
        id: LAYER_IDS.bairrosFill, type: 'fill', source: 'bairros',
        paint: { 'fill-color': '#94a3b8', 'fill-opacity': 0.005 },
      });
      map.addLayer({
        id: LAYER_IDS.bairrosHighlight, type: 'fill', source: 'bairros',
        paint: { 'fill-color': '#0ea5e9', 'fill-opacity': 0.05 },
        filter: ['==', ['get', 'nome'], ''],
      });

      map.addSource('flood', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: LAYER_IDS.floodFill, type: 'fill', source: 'flood',
        paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.3 },
      }, LAYER_IDS.bairrosFill);
      map.addLayer({
        id: LAYER_IDS.floodOutline, type: 'line', source: 'flood',
        paint: { 'line-color': '#3b82f6', 'line-width': 1, 'line-opacity': 0.5 },
      }, LAYER_IDS.bairrosFill);

      map.addSource('ruas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: LAYER_IDS.ruasFlooded, type: 'line', source: 'ruas',
        filter: ['==', ['get', '_flooded'], true],
        paint: { 'line-color': '#ef4444', 'line-width': 3, 'line-opacity': 0.9 },
      }, LAYER_IDS.bairrosFill);
      map.addLayer({
        id: LAYER_IDS.ruasAlert, type: 'line', source: 'ruas',
        filter: ['==', ['get', '_nearFlood'], true],
        paint: { 'line-color': '#f97316', 'line-width': 2.5, 'line-opacity': 0.7, 'line-dasharray': [4, 4] },
      }, LAYER_IDS.bairrosFill);

      let hoverNome = null;
      map.on('mousemove', LAYER_IDS.bairrosFill, (e) => {
        if (e.features?.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          const nome = e.features[0].properties?.nome;
          if (nome && nome !== hoverNome) {
            hoverNome = nome;
            if (nome !== selectedNomeRef.current) {
              map.setFilter(LAYER_IDS.bairrosHighlight, ['==', ['get', 'nome'], nome]);
            }
            if (popupRef.current) popupRef.current.remove();
            popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 })
              .setLngLat(e.lngLat)
              .setHTML(`<div class="text-xs font-bold text-slate-800">${nome}</div>`)
              .addTo(map);
          }
        }
      });
      map.on('mouseleave', LAYER_IDS.bairrosFill, () => {
        map.getCanvas().style.cursor = '';
        hoverNome = null;
        map.setFilter(LAYER_IDS.bairrosHighlight, ['==', ['get', 'nome'], selectedNomeRef.current || '']);
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      });
      map.on('click', LAYER_IDS.bairrosFill, (e) => {
        if (e.features?.length > 0) onNeighborhoodClickRef.current?.(e.features[0]);
      });

      // Street click - show name and flood level
      const streetClickHandler = (e) => {
        if (e.features?.length > 0) {
          const feat = e.features[0];
          const name = feat.properties?.name || feat.properties?.nome || 'Rua';
          const flooded = feat.properties?._flooded;
          const nearFlood = feat.properties?._nearFlood;
          let html = `<div class="text-xs font-bold text-slate-800">${name}</div>`;
          if (flooded) html += `<div class="text-[10px] text-red-600 font-semibold">Alagada</div>`;
          else if (nearFlood) html += `<div class="text-[10px] text-orange-600 font-semibold">Alagaria se subir +50cm</div>`;
          else html += `<div class="text-[10px] text-slate-600">Sem alagamento</div>`;
          if (popupRef.current) popupRef.current.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 8 })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        }
      };
      map.on('click', LAYER_IDS.ruasFlooded, streetClickHandler);
      map.on('click', LAYER_IDS.ruasAlert, streetClickHandler);

      if (bairrosData) {
        const src = map.getSource('bairros');
        if (src) src.setData(bairrosData);
      }
      if (smoothedFloodData.current) {
        const src = map.getSource('flood');
        if (src) src.setData(smoothedFloodData.current);
      }
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
  }, [initialState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    if (prevModeRef.current === mapMode) return;
    prevModeRef.current = mapMode;

    const layers = ['base-osm', 'base-satellite', 'base-topo'];
    const active = mapMode === 'street' ? 'base-osm' : mapMode === 'topo' ? 'base-topo' : 'base-satellite';
    for (const l of layers) {
      map.setLayoutProperty(l, 'visibility', l === active ? 'visible' : 'none');
    }
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply3d = () => {
      if (mode3d) {
        if (TERRAIN_TILES) {
          if (!map.getSource('terrain-rgb')) {
            map.addSource('terrain-rgb', {
              type: 'raster-dem',
              tiles: [TERRAIN_TILES],
              tileSize: 512,
              maxzoom: 14,
            });
          }
          map.setTerrain({ source: 'terrain-rgb', exaggeration: 1.5 });
        }
        map.easeTo({ pitch: 50, duration: 800 });
        if (map.getLayer(LAYER_IDS.floodFill) && map.getLayer(LAYER_IDS.floodFill).type !== 'fill-extrusion') {
          map.removeLayer(LAYER_IDS.floodFill);
          map.addLayer({
            id: LAYER_IDS.floodFill, type: 'fill-extrusion', source: 'flood',
            paint: {
              'fill-extrusion-color': '#2563eb', 'fill-extrusion-opacity': 0.35,
              'fill-extrusion-height': 0.8, 'fill-extrusion-base': 0,
            },
          }, LAYER_IDS.bairrosFill);
        }
      } else {
        map.setTerrain(null);
        map.easeTo({ pitch: 0, duration: 800 });
        if (map.getLayer(LAYER_IDS.floodFill) && map.getLayer(LAYER_IDS.floodFill).type === 'fill-extrusion') {
          map.removeLayer(LAYER_IDS.floodFill);
          map.addLayer({
            id: LAYER_IDS.floodFill, type: 'fill', source: 'flood',
            paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.3 },
          }, LAYER_IDS.bairrosFill);
        }
        setSpinning(false);
      }
    };
    if (map.isStyleLoaded()) {
      apply3d();
    } else {
      map.once('style.load', apply3d);
    }
  }, [mode3d]);

  const smoothedFloodData = useRef(null);
  const prevFloodRef = useRef(null);
  useEffect(() => {
    if (floodData === prevFloodRef.current) return;
    prevFloodRef.current = floodData;
    const smoothed = smoothFloodData(floodData);
    smoothedFloodData.current = smoothed;
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('flood');
    if (src) src.setData(smoothed || { type: 'FeatureCollection', features: [] });
  }, [floodData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !bairrosData) return;
    const src = map.getSource('bairros');
    if (src) src.setData(bairrosData);
  }, [bairrosData]);

  const ruasWithFloodStatus = useMemo(() => {
    if (!ruasData) return null;
    return ruasData.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        _flooded: floodData ? isStreetFlooded(f, floodData) : false,
        _nearFlood: (floodData && floodDataNear) ? isStreetNearFloodExact(f, floodData, floodDataNear) : false,
      },
    }));
  }, [ruasData, floodData, floodDataNear]);

  const filteredRuas = useMemo(() => {
    if (!ruasData || !showRuas) return null;
    let features = ruasWithFloodStatus || ruasData.features;
    if (ruasSearch) {
      const q = ruasSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      features = features.filter(f => {
        const name = (f.properties?.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return name.includes(q);
      });
    }
    if (!selectedNeighborhood) return { ...ruasData, features };
    try {
      const geom = selectedNeighborhood.geometry;
      const poly = geom.type === 'MultiPolygon'
        ? turf.multiPolygon(geom.coordinates)
        : turf.polygon(geom.coordinates);
      const intersection = features.filter((street) => {
        try {
          const sg = street.geometry.type === 'LineString'
            ? turf.lineString(street.geometry.coordinates)
            : turf.multiLineString(street.geometry.coordinates);
          return turf.booleanIntersects(sg, poly);
        } catch { return false; }
      });
      return { ...ruasData, features: intersection };
    } catch { return { ...ruasData, features }; }
  }, [ruasWithFloodStatus, ruasSearch, selectedNeighborhood, showRuas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const src = map.getSource('ruas');
    if (src) src.setData(filteredRuas || { type: 'FeatureCollection', features: [] });
  }, [filteredRuas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentNome = selectedNeighborhood?.properties?.nome ?? null;
    if (prevSelectedNomeRef.current === currentNome) return;
    const hadSelection = prevSelectedNomeRef.current !== null;
    prevSelectedNomeRef.current = currentNome;
    selectedNomeRef.current = currentNome;

    if (map.isStyleLoaded()) {
      map.setFilter(LAYER_IDS.bairrosHighlight, currentNome ? ['==', ['get', 'nome'], currentNome] : ['==', ['get', 'nome'], '']);
    }

    if (currentNome && selectedNeighborhood?.geometry) {
      try {
        const bbox = turf.bbox(selectedNeighborhood);
        const w = bbox[2] - bbox[0], h = bbox[3] - bbox[1], area = w * h;
        const zoom = area < 0.0001 ? 15 : area < 0.001 ? 14 : area < 0.005 ? 13 : 13;
        map.flyTo({
          center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
          zoom: Math.max(12, Math.min(15, zoom)),
          pitch: mode3d ? 50 : 0,
          duration: 1400,
        });
      } catch {}
    } else if (hadSelection) {
      map.flyTo({
        center: [initialState.lng, initialState.lat],
        zoom: initialState.zoom,
        pitch: mode3d ? 50 : 0,
        duration: 1400,
      });
    }
  }, [selectedNeighborhood, initialState, mode3d]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !placing) return;
    const onClick = (e) => {
      const { lng, lat } = e.lngLat;
      setMarker({ lng, lat });
      setPlacing(false);
      map.flyTo({ center: [lng, lat], zoom: 16, pitch: map.getPitch() > 0 ? 60 : 0, duration: 2000 });
    };
    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', onClick);
    return () => { map.getCanvas().style.cursor = ''; map.off('click', onClick); };
  }, [placing]);

  useEffect(() => {
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
    if (!marker || !mapRef.current) return;
    const el = document.createElement('div');
    el.className = 'w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-xl ring-2 ring-red-400 cursor-pointer';
    el.title = 'Local marcado';
    markerRef.current = new maplibregl.Marker({ element: el })
      .setLngLat([marker.lng, marker.lat])
      .addTo(mapRef.current);
  }, [marker]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !spinning) return;
    let stopped = false;
    let tid;
    const rotate = () => {
      if (stopped || !mapRef.current) return;
      if (mapRef.current.getPitch() <= 0) { tid = setTimeout(rotate, 500); return; }
      const opts = {
        bearing: mapRef.current.getBearing() + 12,
        duration: 2500,
        easing: (t) => t,
      };
      if (marker) opts.around = [marker.lng, marker.lat];
      mapRef.current.easeTo(opts);
      tid = setTimeout(rotate, 2500);
    };
    tid = setTimeout(rotate, 500);
    return () => { stopped = true; clearTimeout(tid); if (mapRef.current) mapRef.current.stop(); };
  }, [spinning, marker, mode3d]);

  return (
    <>
      <div ref={containerRef} className="w-full h-full absolute inset-0" />
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
        <button onClick={() => setMode3d(v => !v)}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-lg ${
            mode3d ? 'bg-primary-600 text-white border-primary-500' : 'bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700'
          }`}
        >
          3D {mode3d ? 'ON' : 'OFF'}
        </button>
        {mode3d && (
          <div className="flex gap-1">
            <button onClick={() => setPlacing(v => !v)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-lg ${
                placing ? 'bg-green-600 text-white border-green-500' : 'bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700'
              }`} title="Marcar um local no mapa"
            >
              {placing ? '✕ Cancelar' : '📍 Marcar'}
            </button>
            {marker && (
              <button onClick={() => { setMarker(null); if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; } }}
                className="px-2.5 py-1.5 text-xs font-bold rounded-lg border shadow-lg bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-red-500/80"
                title="Remover marcador"
              >
                🗑 Remover
              </button>
            )}
            <button onClick={() => setSpinning(v => !v)}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-lg ${
                spinning ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-800/90 text-slate-300 border-slate-600 hover:bg-slate-700'
              }`} title="Girar automaticamente"
            >
              {spinning ? '⏹ Parar' : '▶ Girar'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
