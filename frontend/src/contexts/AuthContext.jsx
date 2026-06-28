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
      // Apenas o objeto de usuário não sensível é armazenado
      const storedUser = localStorage.getItem('user')
      if (!storedUser) {
        setLoading(false)
        return
      }

      try {
        // Tenta obter os dados do usuário atual. Isso valida o token existente.
        const response = await api.get('/auth/me')
        setUser(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
      } catch (err) {
        // Se /me falhar, o token pode ter expirado.
        if (navigator.onLine) {
          const refreshed = await refreshTokenFn()
          if (!refreshed) {
            // Se a renovação falhar, limpa a sessão.
            console.log('Session expired, could not refresh.')
            localStorage.removeItem('user')
            setUser(null)
            clearCryptoKey()
            clearTokens()
          } else {
            // Se a renovação funcionar, tenta buscar os dados do usuário novamente.
            try {
              const response = await api.get('/auth/me')
              setUser(response.data)
              localStorage.setItem('user', JSON.stringify(response.data))
            } catch (finalError) {
              console.error('Failed to fetch user data after refresh:', finalError)
              logout() // Se falhar mesmo após refresh, desloga.
            }
          }
        }
      }
      setLoading(false)
    }
    restoreSession()
  }, [refreshTokenFn])

  const login = (userData) => {
    // Não armazene dados sensíveis como CPF diretamente do login.
    // O objeto 'user' deve conter apenas informações seguras para o cliente.
    setUser(userData) 
    localStorage.setItem('user', JSON.stringify(userData)) // Armazena apenas dados não-sensíveis.
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
