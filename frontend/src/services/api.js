import axios from 'axios'
import { cachePut, cacheGet, queueAction } from './offlineDB'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const CACHEABLE_GET = [
  '/river/current', '/river/trend', '/river/history',
  '/stations', '/weather/current', '/rainfall/history',
  '/residence/all', '/residence/locations',
  '/alerts', '/alerts/active', '/flood/impact/',
  '/flood/geojson/',
]

function shouldCache(url) {
  const path = url.replace(API_BASE_URL, '').split('?')[0]
  return CACHEABLE_GET.some(p => path.startsWith(p))
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
})

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.method === 'get' && shouldCache(config.url) && !navigator.onLine) {
    const cached = await cacheGet(config.url)
    if (cached) {
      const adapter = axios.getAdapter(config.adapter)
      config.adapter = () => Promise.resolve({ data: cached, status: 200, statusText: 'OK (offline)', headers: {}, config })
    }
  }

  return config
})

let isRefreshing = false
let failedQueue = []

function processQueue(error, token = null) {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token))
  failedQueue = []
}

api.interceptors.response.use(
  async (response) => {
    if (response.config.method === 'get' && shouldCache(response.config.url)) {
      await cachePut(response.config.url, response.data)
    }
    return response
  },
  async (error) => {
    const original = error.config
    if (!original) return Promise.reject(error)

    if (!navigator.onLine && original.method !== 'get') {
      await queueAction(original.method.toUpperCase(), original.url, original.data)
    }

    if (!navigator.onLine && original.method === 'get') {
      const cached = await cacheGet(original.url)
      if (cached) {
        return Promise.resolve({ data: cached, status: 200, statusText: 'OK (offline)', headers: {}, config: original })
      }
    }
    if (error.response?.status === 401 && !original.url?.includes('/auth/login') && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
      }
      original._retry = true
      isRefreshing = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('no refresh token')
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh-token`, { refreshToken })
        localStorage.setItem('token', data.token)
        localStorage.setItem('refreshToken', data.refreshToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
        processQueue(null, data.token)
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        processQueue(error)
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
        window.location.href = '/portal'
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
