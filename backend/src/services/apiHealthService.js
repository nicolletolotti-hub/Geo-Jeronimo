/**
 * apiHealthService.js
 * Monitora o status da API Defesa Civil RS em memória.
 * Singleton — mesma instância em todo o processo Node.
 */

const TWO_HOURS_MS = 2 * 60 * 60 * 1000

class ApiHealthService {
  constructor(name) {
    this.name = name
    this._status = 'unknown'
    this._lastSuccess = null
    this._lastFailure = null
    this._consecutiveFailures = 0
    this._offlineSince = null
    this._alertedAt = null
  }

  recordSuccess() {
    const wasOffline = this._status === 'offline'
    this._status = 'online'
    this._lastSuccess = new Date()
    this._consecutiveFailures = 0
    if (wasOffline) {
      this._offlineSince = null
      this._alertedAt = null
    }
  }

  recordFailure() {
    this._consecutiveFailures += 1
    this._lastFailure = new Date()
    if (this._status !== 'offline') {
      this._status = 'offline'
      this._offlineSince = new Date()
    }
  }

  /**
   * Retorna true uma vez a cada 2h quando offline por mais de 2h.
   * O chamador escreve o log.
   */
  shouldAlertOffline() {
    if (this._status !== 'offline' || !this._offlineSince) return false
    const downMs = Date.now() - this._offlineSince.getTime()
    if (downMs < TWO_HOURS_MS) return false
    if (this._alertedAt) {
      if (Date.now() - this._alertedAt.getTime() < TWO_HOURS_MS) return false
    }
    this._alertedAt = new Date()
    return true
  }

  getStatus() {
    const now = Date.now()
    let downtimeMs = null
    let downtimeFormatted = null
    if (this._offlineSince) {
      downtimeMs = now - this._offlineSince.getTime()
      downtimeFormatted = formatDuration(downtimeMs)
    }
    const staleMs = this._lastSuccess ? now - this._lastSuccess.getTime() : null
    return {
      api: this.name,
      status: this._status,
      lastSuccess: this._lastSuccess ? this._lastSuccess.toISOString() : null,
      lastFailure: this._lastFailure ? this._lastFailure.toISOString() : null,
      consecutiveFailures: this._consecutiveFailures,
      offlineSince: this._offlineSince ? this._offlineSince.toISOString() : null,
      downtimeMs,
      downtimeFormatted,
      dataStaleMs: staleMs,
      dataStaleFormatted: staleMs != null ? formatDuration(staleMs) : null,
      isDataStale: staleMs != null && staleMs > TWO_HOURS_MS,
      checkedAt: new Date().toISOString(),
    }
  }
}

function formatDuration(ms) {
  if (ms == null) return null
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export const defesaCivilHealth = new ApiHealthService('Defesa Civil RS (GraphQL)')
export default { defesaCivilHealth }
