import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token')
      const storedUser = localStorage.getItem('user')

      if (!token || !storedUser) {
        setLoading(false)
        return
      }

      try {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`
        const response = await api.get('/auth/me')
        setUser(response.data)
        localStorage.setItem('user', JSON.stringify(response.data))
      } catch {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        delete api.defaults.headers.common['Authorization']
      }
      setLoading(false)
    }
    restoreSession()
  }, [])

  const login = (userData, token) => {
    setUser(userData)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setError(null)
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setError(null)
  }

  const isAdmin = () => user?.role === 'admin' || user?.role === 'superadmin'
  const isAgent = () => user?.role === 'agent' || user?.role === 'admin' || user?.role === 'superadmin'
  const isSuperAdmin = () => user?.role === 'superadmin'

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      login,
      logout,
      isAdmin,
      isAgent,
      isSuperAdmin,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
