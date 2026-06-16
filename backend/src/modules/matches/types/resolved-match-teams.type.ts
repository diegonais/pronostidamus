import { Team } from '../../teams/entities/team.entity';

export interface ResolvedMatchTeams {
  homeTeam: Team;
  awayTeam: Team;
}
