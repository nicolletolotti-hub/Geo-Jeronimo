import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import L from 'leaflet';
import * as turf from '@turf/turf';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const FLY_OPTIONS = { duration: 1.4, easeLinearity: 0.22 };

function getBairroStyle(feature, selectedNome) {
  const isSelected = selectedNome && feature.properties?.nome === selectedNome;
  if (isSelected) {
    return { color: '#0ea5e9', weight: 3, fillColor: '#0ea5e9', fillOpacity: 0.05 };
  }
  return { color: '#94a3b8', weight: 1.5, opacity: 0.6, fillColor: '#94a3b8', fillOpacity: 0.005 };
}

function getAdaptiveZoom(bounds) {
  const boundsWidth = bounds.getEast() - bounds.getWest();
  const boundsHeight = bounds.getNorth() - bounds.getSouth();
  const boundsArea = boundsWidth * boundsHeight;
  let targetZoom;
  if (boundsArea < 0.0001) targetZoom = 17;
  else if (boundsArea < 0.001) targetZoom = 16;
  else if (boundsArea < 0.005) targetZoom = 15;
  else targetZoom = 14;
  return Math.max(12, Math.min(18, targetZoom));
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

function bboxOverlaps(bb1, bb2) {
  return bb1[0] <= bb2[2] && bb1[2] >= bb2[0] && bb1[1] <= bb2[3] && bb1[3] >= bb2[1];
}

function getFeatureBbox(f) {
  if (!f._bbox) f._bbox = turf.bbox(f);
  return f._bbox;
}

function isStreetFlooded(streetFeature, floodData) {
  if (!floodData?.features) return false;
  try {
    const streetBbox = turf.bbox(streetFeature);
    for (const floodFeature of floodData.features) {
      if (!bboxOverlaps(streetBbox, getFeatureBbox(floodFeature))) continue;
      const streetGeom = streetFeature.geometry.type === 'LineString'
        ? turf.lineString(streetFeature.geometry.coordinates)
        : turf.multiLineString(streetFeature.geometry.coordinates);
      if (turf.booleanIntersects(streetGeom, floodFeature)) return true;
    }
    return false;
  } catch { return false; }
}

function isStreetNearFlood(streetFeature, floodData, bufferKm = 0.05) {
  if (!floodData?.features || isStreetFlooded(streetFeature, floodData)) return false;
  try {
    const streetGeom = streetFeature.geometry.type === 'LineString'
      ? turf.lineString(streetFeature.geometry.coordinates)
      : turf.multiLineString(streetFeature.geometry.coordinates);
    const buffered = turf.buffer(streetGeom, bufferKm, { units: 'kilometers' });
    if (!buffered) return false;
    const bufferedBbox = turf.bbox(buffered);
    for (const floodFeature of floodData.features) {
      if (!bboxOverlaps(bufferedBbox, getFeatureBbox(floodFeature))) continue;
      if (turf.booleanIntersects(buffered, floodFeature)) return false;
    }
    return true;
  } catch { return false; }
}

const LeafletMap = ({
  initialState, selectedNeighborhood, onNeighborhoodClick,
  floodData, bairrosData, municipioData, ruasData, showRuas, mapMode,
}) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const floodLayerRef = useRef(null);
  const bairrosLayerRef = useRef(null);
  const municipioLayerRef = useRef(null);
  const ruasLayerRef = useRef(null);
  const tileLayerRef = useRef(null);
  const satelliteTileRef = useRef(null);
  const osmTileRef = useRef(null);
  const topoTileRef = useRef(null);
  const currentLayerRef = useRef(null);
  const selectedNomeRef = useRef(null);
  const prevSelectedNomeRef = useRef(null);
  const onNeighborhoodClickRef = useRef(onNeighborhoodClick);

  useEffect(() => {
    onNeighborhoodClickRef.current = onNeighborhoodClick;
  }, [onNeighborhoodClick]);

  const reorderLayers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (floodLayerRef.current) floodLayerRef.current.bringToBack();
    if (bairrosLayerRef.current) bairrosLayerRef.current.bringToFront();
    if (ruasLayerRef.current) ruasLayerRef.current.bringToFront();
  }, []);

  const updateBairrosHighlight = useCallback((selectedNome) => {
    selectedNomeRef.current = selectedNome;
    if (!bairrosLayerRef.current) return;
    bairrosLayerRef.current.eachLayer((layer) => {
      if (!layer.feature) return;
      layer.setStyle(getBairroStyle(layer.feature, selectedNome));
      if (selectedNome && layer.feature.properties?.nome === selectedNome) {
        layer.bringToFront();
      }
    });
  }, []);

  useEffect(() => {
    if (mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [initialState.lat, initialState.lng],
      zoom: initialState.zoom,
      minZoom: 12, maxZoom: 18, zoomControl: true,
    });

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    });
    osmTileRef.current = osmLayer;

    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 19 },
    );
    satelliteTileRef.current = satelliteLayer;

    const topoLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap',
      maxZoom: 17,
    });
    topoTileRef.current = topoLayer;

    satelliteLayer.addTo(map);
    tileLayerRef.current = satelliteLayer;
    currentLayerRef.current = satelliteLayer;

    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initialState]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapMode) return;
    const tileMap = { satellite: satelliteTileRef.current, street: osmTileRef.current, topo: topoTileRef.current };
    const newLayer = tileMap[mapMode];
    if (!newLayer || newLayer === currentLayerRef.current) return;
    if (currentLayerRef.current) map.removeLayer(currentLayerRef.current);
    newLayer.addTo(map);
    currentLayerRef.current = newLayer;
    tileLayerRef.current = newLayer;
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const currentNome = selectedNeighborhood?.properties?.nome ?? null;
    const hadSelection = prevSelectedNomeRef.current !== null;
    const bairroChanged = prevSelectedNomeRef.current !== currentNome;
    if (!bairroChanged) return;
    prevSelectedNomeRef.current = currentNome;
    if (currentNome && selectedNeighborhood?.geometry) {
      const bounds = L.geoJSON(selectedNeighborhood).getBounds();
      const targetZoom = getAdaptiveZoom(bounds);
      map.flyToBounds(bounds, { padding: [48, 48], maxZoom: targetZoom, ...FLY_OPTIONS });
    } else if (hadSelection) {
      map.flyTo([initialState.lat, initialState.lng], initialState.zoom, FLY_OPTIONS);
    }
  }, [selectedNeighborhood, initialState]);

  const smoothedFlood = useMemo(() => smoothFloodData(floodData), [floodData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (floodLayerRef.current) { map.removeLayer(floodLayerRef.current); floodLayerRef.current = null; }
    if (smoothedFlood?.features?.length > 0) {
      floodLayerRef.current = L.geoJSON(smoothedFlood, {
        style: { color: '#2563eb', fillColor: '#3b82f6', fillOpacity: 0.25, weight: 1 },
      }).addTo(map);
    }
    reorderLayers();
  }, [smoothedFlood, reorderLayers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !bairrosData) return;
    if (bairrosLayerRef.current) map.removeLayer(bairrosLayerRef.current);
    bairrosLayerRef.current = L.geoJSON(bairrosData, {
      style: (feature) => getBairroStyle(feature, selectedNomeRef.current),
      onEachFeature: (feature, layer) => {
        layer.on({
            mouseover: (e) => {
            if (feature.properties?.nome === selectedNomeRef.current) return;
            e.target.setStyle({ color: '#38bdf8', weight: 2, opacity: 0.9 });
            e.target.bindTooltip(feature.properties?.nome || 'Bairro', { permanent: false, direction: 'top' }).openTooltip();
          },
          mouseout: (e) => {
            e.target.setStyle(getBairroStyle(feature, selectedNomeRef.current));
            e.target.closeTooltip();
          },
          click: () => onNeighborhoodClickRef.current?.(feature),
        });
      },
    }).addTo(map);
    updateBairrosHighlight(selectedNomeRef.current);
    reorderLayers();
  }, [bairrosData, updateBairrosHighlight, reorderLayers]);

  useEffect(() => {
    if (municipioLayerRef.current) {
      const map = mapRef.current;
      if (map) map.removeLayer(municipioLayerRef.current);
      municipioLayerRef.current = null;
    }
  }, []);

  const filteredRuas = useMemo(() => {
    if (!ruasData || !showRuas) return null;
    const features = ruasData.features.map(f => ({
      ...f,
      properties: { ...f.properties, _flooded: isStreetFlooded(f, smoothedFlood), _nearFlood: isStreetNearFlood(f, smoothedFlood) },
    }));
    if (!selectedNeighborhood) return { ...ruasData, features };

    try {
      const neighborhoodPolygon = turf.polygon(selectedNeighborhood.geometry.coordinates);
      const intersection = features.filter((street) => {
        try {
          if (street.geometry.type === 'LineString') return turf.booleanIntersects(turf.lineString(street.geometry.coordinates), neighborhoodPolygon);
          if (street.geometry.type === 'MultiLineString') return turf.booleanIntersects(turf.multiLineString(street.geometry.coordinates), neighborhoodPolygon);
          return false;
        } catch { return false; }
      });
      return { ...ruasData, features: intersection };
    } catch { return { ...ruasData, features }; }
  }, [ruasData, selectedNeighborhood, showRuas, smoothedFlood]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (ruasLayerRef.current) { map.removeLayer(ruasLayerRef.current); ruasLayerRef.current = null; }
    if (!filteredRuas) return;

    const featuresNoStyle = filteredRuas.features.filter(f => !f.properties._flooded && !f.properties._nearFlood);
    const featuresAlert = filteredRuas.features.filter(f => !f.properties._flooded && f.properties._nearFlood);
    const featuresFlooded = filteredRuas.features.filter(f => f.properties._flooded);

    const allLayers = [];

    if (featuresFlooded.length > 0) {
      allLayers.push(L.geoJSON({ ...filteredRuas, features: featuresFlooded }, {
        style: { color: '#ef4444', weight: 3, opacity: 0.9 },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties?.name || 'Rua', { permanent: false, direction: 'top' });
        },
      }));
    }

    if (featuresAlert.length > 0) {
      allLayers.push(L.geoJSON({ ...filteredRuas, features: featuresAlert }, {
        style: { color: '#f97316', weight: 2.5, opacity: 0.7, dashArray: '4, 4' },
        onEachFeature: (feature, layer) => {
          layer.bindTooltip(feature.properties?.name || 'Rua', { permanent: false, direction: 'top' });
        },
      }));
    }

    if (allLayers.length > 1) {
      const group = L.featureGroup(allLayers);
      ruasLayerRef.current = group;
      map.addLayer(group);
    } else if (allLayers.length === 1) {
      ruasLayerRef.current = allLayers[0];
      map.addLayer(allLayers[0]);
    }

    reorderLayers();
  }, [filteredRuas, reorderLayers]);

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="absolute inset-0" />
    </div>
  );
};

export default LeafletMap;
