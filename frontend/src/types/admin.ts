import type { MatchStatus } from './match'
import type { UserRole } from './session'

export type AdminUserResponse = {
  id: string
  username: string
  roles: UserRole[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type UpdateUserPayload = {
  roles?: UserRole[]
  isActive?: boolean
}

export type UpdateMatchResultPayload = {
  homeScore: number
  awayScore: number
  status?: MatchStatus
}

export type MatchPointsCalculationResponse = {
  matchId: string
  processedPredictions: number
}

export type FinishedMatchesCalculationResponse = {
  processedMatches: number
  results: MatchPointsCalculationResponse[]
}
