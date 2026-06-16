import type { AuthUser } from './session'

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  user: AuthUser
}
