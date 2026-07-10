import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { AppModule } from '../../app.module';
import { hashPassword } from '../../auth/password.util';
import { UserRole } from '../../common/enums/user-role.enum';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { Match } from '../../matches/entities/match.entity';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { Room } from '../../rooms/entities/room.entity';
import { RoomUser } from '../../rooms/entities/room-user.entity';
import { Team } from '../../teams/entities/team.entity';
import { User } from '../../users/entities/user.entity';
import { realisticSeedData } from './realistic-seed-data';

type WorldCupTeam = {
  id: string;
  name_en: string;
  flag?: string;
  fifa_code?: string;
  iso2?: string;
  groups?: string;
};

const TEAM_DISPLAY_NAMES: Record<string, string> = {
  Mexico: 'México',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Czech Republic': 'República Checa',
  Canada: 'Canadá',
  'Bosnia and Herzegovina': 'Bosnia y Herzegovina',
  Qatar: 'Qatar',
  Switzerland: 'Suiza',
  Brazil: 'Brasil',
  Morocco: 'Marruecos',
  Haiti: 'Haití',
  Scotland: 'Escocia',
  'United States': 'Estados Unidos',
  Paraguay: 'Paraguay',
  Australia: 'Australia',
  Turkey: 'Turquía',
  Germany: 'Alemania',
  Curaçao: 'Curazao',
  'Ivory Coast': 'Costa de Marfil',
  Ecuador: 'Ecuador',
  Netherlands: 'Países Bajos',
  Japan: 'Japón',
  Sweden: 'Suecia',
  Tunisia: 'Túnez',
  Belgium: 'Bélgica',
  Egypt: 'Egipto',
  Iran: 'Irán',
  'New Zealand': 'Nueva Zelanda',
  Spain: 'España',
  'Cape Verde': 'Cabo Verde',
  'Saudi Arabia': 'Arabia Saudita',
  Uruguay: 'Uruguay',
  France: 'Francia',
  Senegal: 'Senegal',
  Iraq: 'Irak',
  Norway: 'Noruega',
  Argentina: 'Argentina',
  Algeria: 'Argelia',
  Austria: 'Austria',
  Jordan: 'Jordania',
  Portugal: 'Portugal',
  'Democratic Republic of the Congo': 'Congo',
  Uzbekistan: 'Uzbekistán',
  Colombia: 'Colombia',
  England: 'Inglaterra',
  Croatia: 'Croacia',
  Ghana: 'Ghana',
  Panama: 'Panamá',
};

const TEAM_ALIASES: Record<string, string[]> = {
  'Bosnia and Herzegovina': ['Bosnia', 'Bosnia Herzegovina', 'Bosnia y Herzegovina'],
  'Cape Verde': ['Cabo Verde'],
  'Czech Republic': ['Czechia', 'Chequia', 'República Checa'],
  'Democratic Republic of the Congo': ['Congo', 'DR Congo', 'RD Congo'],
  'Ivory Coast': ['Costa de Marfil'],
  Netherlands: ['Holanda', 'Países Bajos'],
  Qatar: ['Catar'],
  'Saudi Arabia': ['Arabia Saudita', 'Arabia Saudi'],
  'South Africa': ['Sudáfrica'],
  'South Korea': ['Corea del Sur'],
  'United States': ['Estados Unidos', 'USA', 'EEUU'],
};

function resolveTeamsPath(): string {
  return path.resolve(
    process.env.WORLDCUP2026_TEAMS_JSON ??
      path.join(process.cwd(), '..', '..', 'worldcup2026', 'football.teams.json'),
  );
}

function normalizeTeamName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function addLookupValue(
  lookup: Map<string, Team>,
  value: string | null | undefined,
  team: Team,
) {
  if (!value) {
    return;
  }

  lookup.set(normalizeTeamName(value), team);
}

async function clearSeedData(dataSource: DataSource) {
  for (const entity of [Prediction, RoomUser, Match, Room, User, Team]) {
    await dataSource.getRepository(entity).createQueryBuilder().delete().execute();
  }
}

async function seedTeams(teamRepository: Repository<Team>): Promise<Team[]> {
  const rawTeams = JSON.parse(fs.readFileSync(resolveTeamsPath(), 'utf8')) as WorldCupTeam[];
  const teams = rawTeams.map((rawTeam) =>
    teamRepository.create({
      externalId: rawTeam.id,
      name: TEAM_DISPLAY_NAMES[rawTeam.name_en] ?? rawTeam.name_en,
      nameEn: rawTeam.name_en,
      fifaCode: rawTeam.fifa_code ?? null,
      iso2: rawTeam.iso2 ?? null,
      group: rawTeam.groups ?? null,
      flagUrl: rawTeam.flag ?? null,
    }),
  );

  return teamRepository.save(teams);
}

function buildTeamLookup(teams: Team[]): Map<string, Team> {
  const lookup = new Map<string, Team>();

  for (const team of teams) {
    addLookupValue(lookup, team.name, team);
    addLookupValue(lookup, team.nameEn, team);
    addLookupValue(lookup, team.fifaCode, team);
    addLookupValue(lookup, team.iso2, team);

    for (const alias of TEAM_ALIASES[team.nameEn] ?? []) {
      addLookupValue(lookup, alias, team);
    }
  }

  return lookup;
}

async function runSeed() {
  process.env.TZ = process.env.TZ ?? 'America/La_Paz';

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  try {
    await clearSeedData(dataSource);

    const userRepository = dataSource.getRepository(User);
    const roomRepository = dataSource.getRepository(Room);
    const roomUserRepository = dataSource.getRepository(RoomUser);
    const teamRepository = dataSource.getRepository(Team);
    const matchRepository = dataSource.getRepository(Match);
    const predictionRepository = dataSource.getRepository(Prediction);

    const users = realisticSeedData.users.map((seedUser) =>
      userRepository.create({
        id: seedUser.id,
        name: seedUser.name,
        username: seedUser.username,
        email: seedUser.email,
        passwordHash: hashPassword(seedUser.password),
        role: seedUser.role as UserRole,
        isActive: seedUser.isActive,
        createdAt: new Date(seedUser.createdAt),
        updatedAt: new Date(seedUser.updatedAt),
      }),
    );
    await userRepository.save(users);

    const rooms = realisticSeedData.rooms.map((seedRoom) =>
      roomRepository.create({
        id: seedRoom.id,
        name: seedRoom.name,
        isActive: seedRoom.isActive,
        createdAt: new Date(seedRoom.createdAt),
        updatedAt: new Date(seedRoom.updatedAt),
      }),
    );
    await roomRepository.save(rooms);

    const roomUsers = realisticSeedData.roomUsers.map((seedRoomUser) =>
      roomUserRepository.create({
        id: seedRoomUser.id,
        roomId: seedRoomUser.roomId,
        userId: seedRoomUser.userId,
        createdAt: new Date(seedRoomUser.createdAt),
      }),
    );
    await roomUserRepository.save(roomUsers);

    const teams = await seedTeams(teamRepository);
    const teamLookup = buildTeamLookup(teams);

    const matches = realisticSeedData.matches.map((seedMatch) => {
      const teamAInfo = teamLookup.get(normalizeTeamName(seedMatch.teamA));
      const teamBInfo = teamLookup.get(normalizeTeamName(seedMatch.teamB));

      return matchRepository.create({
        id: seedMatch.id,
        roomId: seedMatch.roomId,
        teamAId: teamAInfo?.id ?? null,
        teamBId: teamBInfo?.id ?? null,
        teamA: seedMatch.teamA,
        teamB: seedMatch.teamB,
        matchDate: new Date(seedMatch.matchDate),
        teamAScore: seedMatch.teamAScore,
        teamBScore: seedMatch.teamBScore,
        status: seedMatch.status as MatchStatus,
        isActive: seedMatch.isActive,
        createdAt: new Date(seedMatch.createdAt),
        updatedAt: new Date(seedMatch.updatedAt),
      });
    });
    await matchRepository.save(matches);

    const predictions = realisticSeedData.predictions.map((seedPrediction) =>
      predictionRepository.create({
        id: seedPrediction.id,
        userId: seedPrediction.userId,
        matchId: seedPrediction.matchId,
        predictedTeamAScore: seedPrediction.predictedTeamAScore,
        predictedTeamBScore: seedPrediction.predictedTeamBScore,
        points: seedPrediction.points,
        isCalculated: seedPrediction.isCalculated,
        createdAt: new Date(seedPrediction.createdAt),
        updatedAt: new Date(seedPrediction.updatedAt),
      }),
    );
    await predictionRepository.save(predictions);

    const linkedMatches = matches.filter((match) => match.teamAId || match.teamBId).length;
    const fullyLinkedMatches = matches.filter((match) => match.teamAId && match.teamBId).length;

    console.log(
      `Realistic seed completed: ${users.length} users, ${rooms.length} rooms, ${teams.length} teams, ${matches.length} matches (${fullyLinkedMatches} fully linked, ${linkedMatches} with at least one team), ${predictions.length} predictions.`,
    );
  } finally {
    await app.close();
  }
}

runSeed().catch((error: unknown) => {
  console.error('Realistic seed failed', error);
  process.exitCode = 1;
});
