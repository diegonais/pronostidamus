import type { MatchResponse } from './match'

export type PredictionResponse = {
  id: string
  roomId: string
  userId: string
  matchId: string
  predictedHomeScore: number
  predictedAwayScore: number
  points: number | null
  createdAt: string
  updatedAt: string
  match?: MatchResponse
}
