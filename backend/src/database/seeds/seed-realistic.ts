import { NestFactory } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
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

async function clearSeedData(dataSource: DataSource) {
  for (const entity of [Prediction, RoomUser, Match, Room, User, Team]) {
    await dataSource.getRepository(entity).createQueryBuilder().delete().execute();
  }
}

async function seedTeams(teamRepository: Repository<Team>): Promise<Team[]> {
  const teams = realisticSeedData.teams.map((seedTeam) =>
    teamRepository.create({
      id: seedTeam.id,
      externalId: seedTeam.externalId,
      name: seedTeam.name,
      nameEn: seedTeam.nameEn,
      fifaCode: seedTeam.fifaCode,
      iso2: seedTeam.iso2,
      group: seedTeam.group,
      flagUrl: seedTeam.flagUrl,
      createdAt: new Date(seedTeam.createdAt),
      updatedAt: new Date(seedTeam.updatedAt),
    }),
  );

  return teamRepository.save(teams);
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

    const matches = realisticSeedData.matches.map((seedMatch) => {
      return matchRepository.create({
        id: seedMatch.id,
        roomId: seedMatch.roomId,
        teamAId: seedMatch.teamAId,
        teamBId: seedMatch.teamBId,
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
