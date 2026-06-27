import api from './api'
import { getPendingActions, markActionDone, updateActionRetry } from './offlineDB'

let syncInterval = null

const BACKOFF_DELAYS = [30000, 60000, 300000, 900000, 3600000]

function backoffDelay(retryCount) {
  if (retryCount < 0) return BACKOFF_DELAYS[0]
  if (retryCount >= BACKOFF_DELAYS.length) return BACKOFF_DELAYS[BACKOFF_DELAYS.length - 1]
  return BACKOFF_DELAYS[retryCount]
}

export async function processSyncQueue() {
  const pending = await getPendingActions()
  if (pending.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0

  for (const action of pending) {
    try {
      if (action.method === 'POST') {
        await api.post(action.url, action.body)
      } else if (action.method === 'PUT') {
        await api.put(action.url, action.body)
      } else if (action.method === 'DELETE') {
        await api.delete(action.url)
      }
      await markActionDone(action.id)
      synced++
    } catch {
      const retryCount = (action.retryCount || 0) + 1
      const nextRetryAt = Date.now() + backoffDelay(retryCount)
      await updateActionRetry(action.id, retryCount, nextRetryAt)
      failed++
    }
  }

  return { synced, failed }
}

export function startSyncService(intervalMs = 30000) {
  if (syncInterval) clearInterval(syncInterval)
  if (!navigator.onLine) return

  processSyncQueue().catch(() => {})

  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue().catch(() => {})
    }
  }, intervalMs)
}

export function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
  }
}
