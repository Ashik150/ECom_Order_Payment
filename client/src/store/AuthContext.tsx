/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api/client'
import type { ApiResponse, User } from '../types/api'

interface AuthState {
  user: User | null
  loading: boolean
  setSession: (accessToken: string, user: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const logout = () => {
    sessionStorage.removeItem('raco_access_token')
    setUser(null)
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!sessionStorage.getItem('raco_access_token')) {
        setLoading(false)
        return
      }
      try {
        const response = await api.get<ApiResponse<User>>('/auth/me')
        setUser(response.data.data)
      } catch {
        logout()
      } finally {
        setLoading(false)
      }
    }
    void loadProfile()
    window.addEventListener('raco:unauthorized', logout)
    return () => window.removeEventListener('raco:unauthorized', logout)
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      setSession: (accessToken, nextUser) => {
        sessionStorage.setItem('raco_access_token', accessToken)
        setUser(nextUser)
      },
      logout,
    }),
    [user, loading],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
