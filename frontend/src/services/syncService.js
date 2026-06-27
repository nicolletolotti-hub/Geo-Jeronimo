import api from './api'
import { getPendingActions, markActionDone } from './offlineDB'

let syncInterval = null

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
