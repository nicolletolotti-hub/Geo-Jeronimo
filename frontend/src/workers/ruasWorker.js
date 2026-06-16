importScripts('https://unpkg.com/@turf/turf@6/turf.min.js')
importScripts('https://unpkg.com/rbush@3/rbush.min.js')

self.onmessage = (e) => {
  const { ruasData, floodData, floodDataNear, selectedGeometry, id } = e.data
  const floodIndex = floodData ? buildSpatialIndex(floodData.features) : null
  const nearIndex = floodDataNear ? buildSpatialIndex(floodDataNear.features) : null
  let features = ruasData.features.map(f => ({
    ...f,
    properties: {
      ...f.properties,
      _flooded: floodIndex ? isStreetFlooded(f, floodIndex) : false,
      _nearFlood: nearIndex ? isStreetNearFloodExact(f, nearIndex, floodIndex) : false,
    },
  }))
  if (selectedGeometry) {
    const poly = selectedGeometry.type === 'MultiPolygon'
      ? turf.multiPolygon(selectedGeometry.coordinates)
      : turf.polygon(selectedGeometry.coordinates)
    features = features.filter(street => {
      try {
        const sg = street.geometry.type === 'LineString'
          ? turf.lineString(street.geometry.coordinates)
          : turf.multiLineString(street.geometry.coordinates)
        return turf.booleanIntersects(sg, poly)
      } catch { return false }
    })
  }
  self.postMessage({ features, id })
}

function buildSpatialIndex(features) {
  const tree = new RBush()
  const items = []
  for (let i = 0; i < features.length; i++) {
    const f = features[i]
    try {
      const [minX, minY, maxX, maxY] = turf.bbox(f)
      items.push({ minX, minY, maxX, maxY, feature: f, index: i })
    } catch {}
  }
  tree.load(items)
  return tree
}

function isStreetFlooded(streetFeature, floodIndex) {
  try {
    const streetBbox = turf.bbox(streetFeature)
    const candidates = floodIndex.search({ minX: streetBbox[0], minY: streetBbox[1], maxX: streetBbox[2], maxY: streetBbox[3] })
    for (const c of candidates) {
      try {
        const sg = streetFeature.geometry.type === 'LineString'
          ? turf.lineString(streetFeature.geometry.coordinates)
          : turf.multiLineString(streetFeature.geometry.coordinates)
        if (turf.booleanIntersects(sg, c.feature)) return true
      } catch {}
    }
    return false
  } catch { return false }
}

function isStreetNearFloodExact(streetFeature, nearIndex, floodIndex) {
  if (floodIndex && isStreetFlooded(streetFeature, floodIndex)) return false
  try {
    const streetBbox = turf.bbox(streetFeature)
    const candidates = nearIndex.search({ minX: streetBbox[0], minY: streetBbox[1], maxX: streetBbox[2], maxY: streetBbox[3] })
    for (const c of candidates) {
      try {
        const sg = streetFeature.geometry.type === 'LineString'
          ? turf.lineString(streetFeature.geometry.coordinates)
          : turf.multiLineString(streetFeature.geometry.coordinates)
        if (turf.booleanIntersects(sg, c.feature)) return true
      } catch {}
    }
    return false
  } catch { return false }
}
