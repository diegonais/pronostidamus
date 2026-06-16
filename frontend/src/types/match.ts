export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled'

export type TeamSummary = {
  id: string
  name: string
  shortName: string
  countryCode: string | null
  logoUrl: string | null
}

export type MatchResponse = {
  id: string
  externalId: string | null
  groupName: string
  round: string
  matchDate: string
  status: MatchStatus
  homeScore: number | null
  awayScore: number | null
  venue: string | null
  createdAt: string
  updatedAt: string
  homeTeam: TeamSummary
  awayTeam: TeamSummary
}
