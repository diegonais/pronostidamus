export type UserRole = 'user' | 'admin'

export type Session = {
  token: string
  username: string
  roles: UserRole[]
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
  window.localStorage.setItem(TOKEN_STORAGE_KEY, session.token)
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY)
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  window.location.href = '/login'
}
