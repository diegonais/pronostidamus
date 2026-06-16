export type UserRole = 'user' | 'admin'

export type AuthUser = {
  id: string
  username: string
  roles: UserRole[]
  isActive: boolean
}

export type Session = {
  accessToken: string
  user: AuthUser
}

const SESSION_STORAGE_KEY = 'pronostidamus.session'
const TOKEN_STORAGE_KEY = 'pronostidamus.token'

export function getSession(): Session | null {
  const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as Session
  } catch {
    clearSession()
    return null
  }
}

export function createSession(session: Session) {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
  window.localStorage.setItem(TOKEN_STORAGE_KEY, session.accessToken)
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}
