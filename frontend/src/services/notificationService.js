const NOTIFIED_KEY = 'geojeronimo_notified_ids'
const CHECK_INTERVAL = 60000

function getNotifiedIds() {
  try {
    const stored = localStorage.getItem(NOTIFIED_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

function addNotifiedId(id) {
  const ids = getNotifiedIds()
  ids.add(String(id))
  try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids])) } catch {}
}

let intervalId = null

export function startNotificationService(api) {
  if (typeof Notification === 'undefined') return
  if (Notification.permission === 'default') Notification.requestPermission()
  if (intervalId) clearInterval(intervalId)

  const check = async () => {
    if (Notification.permission !== 'granted') return
    try {
      const res = await api.get('/alerts/active')
      const alerts = res.data.alerts || []
      const notifiedIds = getNotifiedIds()
      for (const a of alerts) {
        const id = String(a.id)
        if (notifiedIds.has(id)) continue
        new Notification(a.title, { body: a.message, icon: '/favicon.ico', tag: `alert-${id}` })
        addNotifiedId(id)
      }
    } catch {}
  }

  check()
  intervalId = setInterval(check, CHECK_INTERVAL)
}

export function stopNotificationService() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
}
