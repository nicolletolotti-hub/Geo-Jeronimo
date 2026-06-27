const floodCache = {}

export function getFloodCache(key) {
  return floodCache[key] ?? null
}

export function setFloodCache(key, data) {
  floodCache[key] = data
}
