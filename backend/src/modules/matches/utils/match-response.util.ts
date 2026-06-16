import { Match } from '../entities/match.entity';

export function toMatchResponse(match: Match) {
  return {
    id: match.id,
    externalId: match.externalId,
    groupName: match.groupName,
    round: match.round,
    matchDate: match.matchDate,
    status: match.status,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    venue: match.venue,
    createdAt: match.createdAt,
    updatedAt: match.updatedAt,
    homeTeam: {
      id: match.homeTeam.id,
      name: match.homeTeam.name,
      shortName: match.homeTeam.shortName,
      countryCode: match.homeTeam.countryCode,
      logoUrl: match.homeTeam.logoUrl,
    },
    awayTeam: {
      id: match.awayTeam.id,
      name: match.awayTeam.name,
      shortName: match.awayTeam.shortName,
      countryCode: match.awayTeam.countryCode,
      logoUrl: match.awayTeam.logoUrl,
    },
  };
}
