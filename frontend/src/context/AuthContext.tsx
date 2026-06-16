import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { apiClient } from '../api/apiClient'
import type { LoginRequest, LoginResponse } from '../types/auth'
import { clearSession, createSession, getSession, type AuthUser, type Session } from '../types/session'
import { AuthContext, type AuthContextValue } from './authContext'

type AuthProviderProps = {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(() => getSession())
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(getSession()?.accessToken))

  useEffect(() => {
    const storedSession = getSession()

    if (!storedSession?.accessToken) {
      return
    }

    let isMounted = true

    const hydrateSession = async () => {
      try {
        const user = await apiClient.get<AuthUser>('/auth/me')

        if (!isMounted) {
          return
        }

        const nextSession: Session = {
          accessToken: storedSession.accessToken,
          user,
        }

        createSession(nextSession)
        setSession(nextSession)
      } catch {
        if (!isMounted) {
          return
        }

        clearSession()
        setSession(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void hydrateSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = async (credentials: LoginRequest) => {
    const response = await apiClient.post<LoginResponse>('/auth/login', credentials, {
      requiresAuth: false,
    })

    const nextSession: Session = {
      accessToken: response.accessToken,
      user: response.user,
    }

    createSession(nextSession)
    setIsLoading(false)
    setSession(nextSession)
  }

  const logout = () => {
    clearSession()
    setIsLoading(false)
    setSession(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(session?.accessToken),
      isLoading,
      user: session?.user ?? null,
      token: session?.accessToken ?? null,
      login,
      logout,
    }),
    [isLoading, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
