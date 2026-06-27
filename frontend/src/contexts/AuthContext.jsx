import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { getCryptoKey, clearCryptoKey } from '../services/cryptoStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshTokenFn = useCallback(async () => {
    const storedRefresh = localStorage.getItem('refreshToken')
    if (!storedRefresh) return false
    try {
      const res = await api.post('/auth/refresh-token', { refreshToken: storedRefresh })
      const { token, refreshToken } = res.data
      localStorage.setItem('token', token)
      localStorage.setItem('refreshToken', refreshToken)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    clearCryptoKey()
    setError(null)
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (!token || !storedUser) {
        setLoading(false)
        return
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      try {
        const response = await api.get('/auth/me')
        setUser(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
        deriveCryptoKey(response.data.cpf)
      } catch {
        const refreshed = await refreshTokenFn()
        if (!refreshed) {
          logout()
        } else {
          try {
            const response = await api.get('/auth/me')
            setUser(response.data)
            localStorage.setItem('user', JSON.stringify(response.data))
            deriveCryptoKey(response.data.cpf)
          } catch {}
        }
      }
      setLoading(false)
    }
    restoreSession()
  }, [refreshTokenFn, logout])

  function deriveCryptoKey(cpf) {
    if (cpf) getCryptoKey(cpf).catch(() => {})
  }

  const login = (userData, token, refreshToken) => {
    setUser(userData)
    localStorage.setItem('token', token)
    localStorage.setItem('refreshToken', refreshToken)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    if (userData?.cpf) getCryptoKey(userData.cpf).catch(() => {})
    setError(null)
  }

  const isAdmin = () => user?.profile === 'ADMIN' || user?.role === 'admin' || user?.role === 'superadmin'
  const isAgent = () => {
    const serverProfiles = ['ADMIN','DEFESA_CIVIL','SAUDE','ASSISTENCIA_SOCIAL','DEFESA_ANIMAL','AGENTE_CAMPO']
    return serverProfiles.includes(user?.profile) || user?.role === 'admin' || user?.role === 'superadmin'
  }
  const hasProfile = (profile) => {
    if (user?.profile === 'ADMIN' || user?.role === 'superadmin') return true
    if (user?.profile === profile) return true
    if (Array.isArray(user?.approvedProfiles)) return user.approvedProfiles.includes(profile)
    return false
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      isAdmin,
      isAgent,
      hasProfile,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
