import { createContext } from 'react'
import type { LoginRequest } from '../types/auth'
import type { AuthUser } from '../types/session'

export type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  user: AuthUser | null
  token: string | null
  login: (credentials: LoginRequest) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
