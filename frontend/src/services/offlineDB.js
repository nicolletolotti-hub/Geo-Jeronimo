import { encryptSensitive, decryptSensitive } from './cryptoStorage'

const DB_NAME = 'GeoJeronimoOffline'
const DB_VERSION = 2

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (e) => {
      const db = e.target.result
      const tx = e.target.transaction
      ;['queue', 'alerts', 'acs_records'].forEach(s => {
        if (db.objectStoreNames.contains(s)) {
          db.deleteObjectStore(s)
        }
      })
      if (!db.objectStoreNames.contains('cache')) {
        db.createObjectStore('cache', { keyPath: 'key' })
      }
      {
        const q = db.createObjectStore('queue', { keyPath: 'id', autoIncrement: true })
        q.createIndex('status', 'status', { unique: false })
      }
      {
        db.createObjectStore('alerts', { keyPath: 'id', autoIncrement: true })
      }
      {
        const a = db.createObjectStore('acs_records', { keyPath: 'id', autoIncrement: true })
        a.createIndex('synced', 'synced', { unique: false })
        a.createIndex('bairro', 'bairro', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function cachePut(key, data) {
  try {
    const db = await openDB()
    const tx = db.transaction('cache', 'readwrite')
    tx.objectStore('cache').put({ key, data, timestamp: Date.now() })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* silent fail */ }
}

export async function cacheGet(key) {
  try {
    const db = await openDB()
    const tx = db.transaction('cache', 'readonly')
    const result = await new Promise((resolve) => {
      const req = tx.objectStore('cache').get(key)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
    db.close()
    return result?.data ?? null
  } catch { return null }
}

export async function cacheGetAll() {
  try {
    const db = await openDB()
    const tx = db.transaction('cache', 'readonly')
    const result = await new Promise((resolve) => {
      const req = tx.objectStore('cache').getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
    db.close()
    return result || []
  } catch { return [] }
}

export async function queueAction(method, url, body) {
  try {
    const encryptedBody = body ? await encryptSensitive(body) : null
    const db = await openDB()
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').add({
      method,
      url,
      encrypted_body: encryptedBody,
      status: 'pending',
      createdAt: Date.now()
    })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* silent fail */ }
}

export async function getPendingActions() {
  try {
    const db = await openDB()
    const tx = db.transaction('queue', 'readonly')
    const index = tx.objectStore('queue').index('status')
    const result = await new Promise((resolve) => {
      const req = index.getAll('pending')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
    db.close()
    if (!result) return []
    const decrypted = []
    for (const action of result) {
      if (action.encrypted_body) {
        const body = await decryptSensitive(action.encrypted_body)
        decrypted.push({ ...action, body, encrypted_body: undefined })
      } else {
        decrypted.push(action)
      }
    }
    return decrypted
  } catch { return [] }
}

export async function markActionDone(id) {
  try {
    const db = await openDB()
    const tx = db.transaction('queue', 'readwrite')
    tx.objectStore('queue').delete(id)
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* silent fail */ }
}

export async function saveAlert(alert) {
  try {
    const db = await openDB()
    const tx = db.transaction('alerts', 'readwrite')
    tx.objectStore('alerts').put(alert)
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* silent fail */ }
}

export async function getCachedAlerts() {
  try {
    const db = await openDB()
    const tx = db.transaction('alerts', 'readonly')
    const result = await new Promise((resolve) => {
      const req = tx.objectStore('alerts').getAll()
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
    db.close()
    return result || []
  } catch { return [] }
}

export async function saveAcsRecord(record) {
  try {
    const encryptedData = await encryptSensitive(record)
    const db = await openDB()
    const tx = db.transaction('acs_records', 'readwrite')
    tx.objectStore('acs_records').add({
      synced: false,
      bairro: record.bairro || '',
      encrypted_data: encryptedData,
      createdAt: Date.now()
    })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* silent fail */ }
}

export async function getUnsyncedAcsRecords() {
  try {
    const db = await openDB()
    const tx = db.transaction('acs_records', 'readonly')
    const index = tx.objectStore('acs_records').index('synced')
    const result = await new Promise((resolve) => {
      const req = index.getAll(false)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
    db.close()
    if (!result) return []
    const decrypted = []
    for (const record of result) {
      const data = await decryptSensitive(record.encrypted_data)
      if (data) {
        decrypted.push({ ...data, id: record.id, synced: record.synced, createdAt: record.createdAt })
      }
    }
    return decrypted
  } catch { return [] }
}

export async function markAcsRecordSynced(id) {
  try {
    const db = await openDB()
    const tx = db.transaction('acs_records', 'readwrite')
    const store = tx.objectStore('acs_records')
    const record = await new Promise((resolve) => {
      const req = store.get(id)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve(null)
    })
    if (record) {
      record.synced = true
      store.put(record)
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch { /* silent fail */ }
}

export async function getAcsRecordsByBairro(bairro) {
  try {
    const db = await openDB()
    const tx = db.transaction('acs_records', 'readonly')
    const index = tx.objectStore('acs_records').index('bairro')
    const result = await new Promise((resolve) => {
      const req = index.getAll(bairro)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => resolve([])
    })
    db.close()
    if (!result) return []
    const decrypted = []
    for (const record of result) {
      const data = await decryptSensitive(record.encrypted_data)
      if (data) {
        decrypted.push({ ...data, id: record.id, synced: record.synced, createdAt: record.createdAt })
      }
    }
    return decrypted
  } catch { return [] }
}
