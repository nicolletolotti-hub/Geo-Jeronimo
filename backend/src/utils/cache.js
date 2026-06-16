const CACHE_DEFAULT_TTL = 120_000

export class LRUCache {
  constructor(maxSize = 50, defaultTTL = CACHE_DEFAULT_TTL) {
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
    this.map = new Map()
  }

  get(key) {
    const entry = this.map.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key)
      return null
    }
    this.map.delete(key)
    this.map.set(key, entry)
    return entry.value
  }

  set(key, value, ttl) {
    if (this.map.has(key)) this.map.delete(key)
    if (this.map.size >= this.maxSize) {
      const oldest = this.map.keys().next().value
      if (oldest) this.map.delete(oldest)
    }
    this.map.set(key, { value, expiresAt: Date.now() + (ttl || this.defaultTTL) })
  }

  clear() { this.map.clear() }

  get size() { return this.map.size }
}

export const defesaCivilCache = new LRUCache(20, 60_000)
export const stationsCache = new LRUCache(10, 120_000)
export const weatherCache = new LRUCache(10, 300_000)
