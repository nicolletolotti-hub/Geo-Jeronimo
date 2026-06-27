import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { getCryptoKey, clearCryptoKey } from '../services/cryptoStorage'
import { clearTokens } from '../services/tokenStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshTokenFn = useCallback(async () => {
    try {
      await api.post('/auth/refresh-token')
      return true
    } catch {
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout') } catch {}
    setUser(null)
    localStorage.removeItem('user')
    clearTokens()
    clearCryptoKey()
    setError(null)
  }, [])

  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem('user')
      if (!storedUser) {
        setLoading(false)
        return
      }
      const parsed = JSON.parse(storedUser)
      setUser(parsed)
      deriveCryptoKey(parsed.cpf)
      try {
        const response = await api.get('/auth/me')
        setUser(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
        deriveCryptoKey(response.data.cpf)
      } catch (err) {
        if (navigator.onLine) {
          const refreshed = await refreshTokenFn()
          if (!refreshed) {
            localStorage.removeItem('user')
            setUser(null)
            clearCryptoKey()
          } else {
            try {
              const response = await api.get('/auth/me')
              setUser(response.data)
              localStorage.setItem('user', JSON.stringify(response.data))
              deriveCryptoKey(response.data.cpf)
            } catch {}
          }
        }
      }
      setLoading(false)
    }
    restoreSession()
  }, [refreshTokenFn])

  function deriveCryptoKey(cpf) {
    if (cpf) getCryptoKey(cpf).catch(() => {})
  }

  const login = (userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
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
