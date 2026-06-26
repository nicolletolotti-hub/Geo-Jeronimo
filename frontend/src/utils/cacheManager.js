const CACHE_KEYS = {
  geojeronimo_ruas_cache: { maxSize: 5 * 1024 * 1024, ttl: 24 * 3600000 },
  geojeronimo_municipio_cache: { maxSize: 2 * 1024 * 1024, ttl: 24 * 3600000 },
}

export function getCachedData(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    if (entry._cachedAt && Date.now() - entry._cachedAt > (CACHE_KEYS[key]?.ttl || 3600000)) {
      localStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch { return null }
}

export function setCachedData(key, data) {
  try {
    const serialized = JSON.stringify({ data, _cachedAt: Date.now() })
    const size = new Blob([serialized]).size
    if (CACHE_KEYS[key] && size > CACHE_KEYS[key].maxSize) return
    localStorage.setItem(key, serialized)
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      const oldest = Object.keys(CACHE_KEYS).reduce((a, b) => {
        const ta = localStorage.getItem(a) ? JSON.parse(localStorage.getItem(a))._cachedAt || 0 : Infinity
        const tb = localStorage.getItem(b) ? JSON.parse(localStorage.getItem(b))._cachedAt || 0 : Infinity
        return ta < tb ? a : b
      })
      localStorage.removeItem(oldest)
      try { localStorage.setItem(key, JSON.stringify({ data, _cachedAt: Date.now() })) } catch { /* ignore */ }
    }
  }
}

export function limparCache() {
  Object.keys(CACHE_KEYS).forEach(k => localStorage.removeItem(k))
}
