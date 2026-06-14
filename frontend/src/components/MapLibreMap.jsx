import { useRef, useEffect, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';

const FLY_DURATION = 1400;

const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrain-rgb/{z}/{x}/{y}.png';

const OSM_TILES = ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'];
const SATELLITE_TILES = ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'];
const TOPO_TILES = ['https://tile.opentopomap.org/{z}/{x}/{y}.png'];

const BASE_STYLE = {
  version: 8,
  sources: {
    osm: { type: 'raster', tiles: OSM_TILES, tileSize: 256 },
    satellite: { type: 'raster', tiles: SATELLITE_TILES, tileSize: 256 },
    topo: { type: 'raster', tiles: TOPO_TILES, tileSize: 256 },
    'terrain-rgb': { type: 'raster-dem', tiles: [TERRAIN_TILES], tileSize: 256, maxzoom: 14 },
  },
  layers: [
    { id: 'base-osm', type: 'raster', source: 'osm', layout: { visibility: 'none' } },
    { id: 'base-satellite', type: 'raster', source: 'satellite', layout: { visibility: 'visible' } },
    { id: 'base-topo', type: 'raster', source: 'topo', layout: { visibility: 'none' } },
  ],
  terrain: { source: 'terrain-rgb', exaggeration: 1.5 },
};

function getAdaptiveZoom(bounds) {
  const boundsWidth = bounds.getEast() - bounds.getWest();
  const boundsHeight = bounds.getNorth() - bounds.getSouth();
  const boundsArea = boundsWidth * boundsHeight;
  if (boundsArea < 0.0001) return 17;
  if (boundsArea < 0.001) return 16;
  if (boundsArea < 0.005) return 15;
  return 14;
}

function smoothFloodData(geojson, tolerance = 0.0001) {
  if (!geojson?.features) return geojson;
  return {
    ...geojson,
    features: geojson.features.map(f => {
      if (f.geometry.type === 'Polygon') {
        try { return turf.simplify(f, { tolerance, highQuality: true }); }
        catch { return f; }
      }
      if (f.geometry.type === 'MultiPolygon') {
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

function isStreetNearFlood(streetFeature, floodData, bufferKm = 0.05) {
  if (!floodData?.features || isStreetFlooded(streetFeature, floodData)) return false;
  try {
    const sg = streetFeature.geometry.type === 'LineString'
      ? turf.lineString(streetFeature.geometry.coordinates)
      : turf.multiLineString(streetFeature.geometry.coordinates);
    const buffered = turf.buffer(sg, bufferKm, { units: 'kilometers' });
    if (!buffered) return false;
    const bbox = turf.bbox(buffered);
    for (const ff of floodData.features) {
      if (!intersectBbox(bbox, getBbox(ff))) continue;
      if (turf.booleanIntersects(buffered, ff)) return false;
    }
    return true;
  } catch { return false; }
}

const LAYER_IDS = {
  floodFill: 'flood-fill',
  floodOutline: 'flood-outline',
  bairrosFill: 'bairros-fill',
  bairrosOutline: 'bairros-outline',
  bairrosHighlight: 'bairros-highlight',
  ruasFlooded: 'ruas-flooded',
  ruasAlert: 'ruas-alert',
};

export default function MapLibreMap({
  initialState, selectedNeighborhood, onNeighborhoodClick,
  floodData, bairrosData, municipioData, ruasData, showRuas, mapMode,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const prevModeRef = useRef(mapMode);
  const selectedNomeRef = useRef(null);
  const prevSelectedNomeRef = useRef(null);
  const onNeighborhoodClickRef = useRef(onNeighborhoodClick);
  const hoveredBairroIdRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    onNeighborhoodClickRef.current = onNeighborhoodClick;
  }, [onNeighborhoodClick]);

  useEffect(() => {
    if (mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: BASE_STYLE,
      center: [initialState.lng, initialState.lat],
      zoom: initialState.zoom,
      pitch: 50,
      bearing: 0,
      antialias: true,
    });

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      map.resize();

      map.addSource('bairros', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, promoteId: 'nome' });

      map.addLayer({
        id: LAYER_IDS.bairrosFill,
        type: 'fill',
        source: 'bairros',
        paint: {
          'fill-color': '#94a3b8',
          'fill-opacity': 0.005,
        },
      });
      map.addLayer({
        id: LAYER_IDS.bairrosOutline,
        type: 'line',
        source: 'bairros',
        paint: {
          'line-color': '#94a3b8',
          'line-width': 1.5,
          'line-opacity': 0.6,
        },
      });
      map.addLayer({
        id: LAYER_IDS.bairrosHighlight,
        type: 'fill',
        source: 'bairros',
        paint: {
          'fill-color': '#0ea5e9',
          'fill-opacity': 0.05,
        },
        filter: ['==', ['get', 'nome'], ''],
      });

      map.addSource('flood', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: LAYER_IDS.floodFill,
        type: 'fill-extrusion',
        source: 'flood',
        paint: {
          'fill-extrusion-color': '#2563eb',
          'fill-extrusion-opacity': 0.35,
          'fill-extrusion-height': 0.8,
          'fill-extrusion-base': 0,
        },
      }, LAYER_IDS.bairrosFill);
      map.addLayer({
        id: LAYER_IDS.floodOutline,
        type: 'line',
        source: 'flood',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 1,
          'line-opacity': 0.5,
        },
      }, LAYER_IDS.bairrosFill);

      map.addSource('ruas', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: LAYER_IDS.ruasFlooded,
        type: 'line',
        source: 'ruas',
        filter: ['==', ['get', '_flooded'], true],
        paint: {
          'line-color': '#ef4444',
          'line-width': 3,
          'line-opacity': 0.9,
        },
      }, LAYER_IDS.bairrosFill);
      map.addLayer({
        id: LAYER_IDS.ruasAlert,
        type: 'line',
        source: 'ruas',
        filter: ['==', ['get', '_nearFlood'], true],
        paint: {
          'line-color': '#f97316',
          'line-width': 2.5,
          'line-opacity': 0.7,
          'line-dasharray': [4, 4],
        },
      }, LAYER_IDS.bairrosFill);

      map.on('mousemove', 'bairros-fill', (e) => {
        if (e.features?.length > 0) {
          map.getCanvas().style.cursor = 'pointer';
          const nome = e.features[0].properties?.nome;
          if (nome && nome !== hoveredBairroIdRef.current) {
            hoveredBairroIdRef.current = nome;
            if (nome !== selectedNomeRef.current) {
              map.setFilter(LAYER_IDS.bairrosHighlight, ['==', ['get', 'nome'], nome]);
            }
            if (popupRef.current) popupRef.current.remove();
            popupRef.current = new maplibregl.Popup({
              closeButton: false, closeOnClick: false, offset: 8,
            })
              .setLngLat(e.lngLat)
              .setHTML(`<div class="text-xs font-bold text-slate-800">${nome}</div>`)
              .addTo(map);
          }
        }
      });

      map.on('mouseleave', 'bairros-fill', () => {
        map.getCanvas().style.cursor = '';
        hoveredBairroIdRef.current = null;
        map.setFilter(LAYER_IDS.bairrosHighlight, ['==', ['get', 'nome'], selectedNomeRef.current || '']);
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      });

      map.on('click', 'bairros-fill', (e) => {
        if (e.features?.length > 0) {
          onNeighborhoodClickRef.current?.(e.features[0]);
        }
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.loaded()) return;
    if (prevModeRef.current === mapMode) return;
    prevModeRef.current = mapMode;

    const layers = ['base-osm', 'base-satellite', 'base-topo'];
    const active = mapMode === 'street' ? 'base-osm'
      : mapMode === 'topo' ? 'base-topo' : 'base-satellite';
    for (const l of layers) {
      map.setLayoutProperty(l, 'visibility', l === active ? 'visible' : 'none');
    }
  }, [mapMode]);

  const smoothedFlood = useMemo(() => smoothFloodData(floodData), [floodData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('flood');
    if (!src) return;
    src.setData(smoothedFlood || { type: 'FeatureCollection', features: [] });
  }, [smoothedFlood]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bairrosData) return;
    const src = map.getSource('bairros');
    if (!src) return;
    src.setData(bairrosData);
  }, [bairrosData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !municipioData) return;
  }, [municipioData]);

  const filteredRuas = useMemo(() => {
    if (!ruasData || !showRuas) return null;
    const features = ruasData.features.map(f => ({
      ...f,
      properties: {
        ...f.properties,
        _flooded: isStreetFlooded(f, smoothedFlood),
        _nearFlood: isStreetNearFlood(f, smoothedFlood),
      },
    }));
    if (!selectedNeighborhood) return { ...ruasData, features };
    try {
      const poly = turf.polygon(selectedNeighborhood.geometry.coordinates);
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
  }, [ruasData, selectedNeighborhood, showRuas, smoothedFlood]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const src = map.getSource('ruas');
    if (!src) return;
    src.setData(filteredRuas || { type: 'FeatureCollection', features: [] });
  }, [filteredRuas]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentNome = selectedNeighborhood?.properties?.nome ?? null;
    const hadSelection = prevSelectedNomeRef.current !== null;
    const bairroChanged = prevSelectedNomeRef.current !== currentNome;
    if (!bairroChanged) return;
    prevSelectedNomeRef.current = currentNome;
    selectedNomeRef.current = currentNome;

    const filter = currentNome ? ['==', ['get', 'nome'], currentNome] : ['==', ['get', 'nome'], ''];
    map.setFilter(LAYER_IDS.bairrosHighlight, filter);

    if (currentNome && selectedNeighborhood?.geometry) {
      try {
        const bounds = turf.bbox(selectedNeighborhood);
        const targetZoom = getAdaptiveZoom({
          getEast: () => bounds[2], getWest: () => bounds[0],
          getNorth: () => bounds[3], getSouth: () => bounds[1],
        });
        map.flyTo({
          center: [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2],
          zoom: targetZoom,
          pitch: 50,
          duration: FLY_DURATION,
        });
      } catch {}
    } else if (hadSelection) {
      map.flyTo({
        center: [initialState.lng, initialState.lat],
        zoom: initialState.zoom,
        pitch: 50,
        duration: FLY_DURATION,
      });
    }
  }, [selectedNeighborhood, initialState]);

  return <div ref={containerRef} className="w-full h-full absolute inset-0" />;
}
