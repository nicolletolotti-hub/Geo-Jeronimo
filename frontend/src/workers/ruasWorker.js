importScripts('https://unpkg.com/@turf/turf@6/turf.min.js')

self.onmessage = (e) => {
  const { ruasData, floodData, floodDataNear, id } = e.data
  const features = ruasData.features.map(f => ({
    ...f,
    properties: {
      ...f.properties,
      _flooded: floodData ? isStreetFlooded(f, floodData) : false,
      _nearFlood: (floodData && floodDataNear) ? isStreetNearFloodExact(f, floodData, floodDataNear) : false,
    },
  }))
  self.postMessage({ features, id })
}

function intersectBbox(bb1, bb2) {
  return bb1[0] <= bb2[2] && bb1[2] >= bb2[0] && bb1[1] <= bb2[3] && bb1[3] >= bb2[1]
}

function getBboxCache() {
  const cache = new Map()
  return (f) => {
    if (cache.has(f)) return cache.get(f)
    const bbox = turf.bbox(f)
    cache.set(f, bbox)
    return bbox
  }
}

const getBbox = getBboxCache()

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

function isStreetNearFloodExact(streetFeature, floodData, floodDataNear) {
  if (!floodDataNear?.features || isStreetFlooded(streetFeature, floodData)) return false
  try {
    const streetBbox = turf.bbox(streetFeature)
    for (const ff of floodDataNear.features) {
      if (!intersectBbox(streetBbox, getBbox(ff))) continue
      const sg = streetFeature.geometry.type === 'LineString'
        ? turf.lineString(streetFeature.geometry.coordinates)
        : turf.multiLineString(streetFeature.geometry.coordinates)
      if (turf.booleanIntersects(sg, ff)) return true
    }
    return false
  } catch { return false }
}
