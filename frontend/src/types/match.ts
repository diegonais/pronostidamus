export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'cancelled'

export type MatchCardView = {
  id: string
  homeTeam: string
  awayTeam: string
  groupName: string
  matchDateLabel: string
  status: MatchStatus
}
