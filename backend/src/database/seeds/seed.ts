import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { Match } from '../../matches/entities/match.entity';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { Room } from '../../rooms/entities/room.entity';
import { RoomUser } from '../../rooms/entities/room-user.entity';
import { hashPassword } from '../../auth/password.util';
import { User } from '../../users/entities/user.entity';

function parseScore(score: string): { teamAScore: number; teamBScore: number } {
  const [teamAScore, teamBScore] = score.split('-').map((value) => parseInt(value, 10));

  return { teamAScore, teamBScore };
}

async function runSeed() {
  process.env.TZ = process.env.TZ ?? 'America/La_Paz';

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const userRepository = dataSource.getRepository(User);
  const roomRepository = dataSource.getRepository(Room);
  const roomUserRepository = dataSource.getRepository(RoomUser);
  const matchRepository = dataSource.getRepository(Match);
  const predictionRepository = dataSource.getRepository(Prediction);

  const seedUsers = [
    {
      name: 'Diego Armando',
      username: 'diego',
      email: 'diego@example.com',
      password: 'diego123',
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      name: 'Salva',
      username: 'salva',
      email: 'salva@example.com',
      password: 'salva123',
      role: UserRole.USER,
      isActive: true,
    },
    {
      name: 'Josue',
      username: 'josue',
      email: 'josue@example.com',
      password: 'josue123',
      role: UserRole.USER,
      isActive: true,
    },
    {
      name: 'Paolo',
      username: 'paolo',
      email: 'paolo@example.com',
      password: 'paolo123',
      role: UserRole.USER,
      isActive: true,
    },
  ];

  const users: User[] = [];
  for (const seedUser of seedUsers) {
    let user = await userRepository.findOne({
      where: { email: seedUser.email },
    });

    if (!user) {
      user = userRepository.create({
        ...seedUser,
        passwordHash: hashPassword(seedUser.password),
      });
    } else {
      Object.assign(user, {
        name: seedUser.name,
        username: seedUser.username,
        email: seedUser.email,
        role: seedUser.role,
        isActive: seedUser.isActive,
        passwordHash: hashPassword(seedUser.password),
      });
    }

    user = await userRepository.save(user);

    users.push(user);
  }

  let room = await roomRepository.findOne({
    where: { name: 'apuestillas mundialcillo' },
  });

  if (!room) {
    room = roomRepository.create({
      name: 'apuestillas mundialcillo',
      isActive: true,
    });
    room = await roomRepository.save(room);
  }

  for (const user of users) {
    const membership = await roomUserRepository.findOne({
      where: {
        roomId: room.id,
        userId: user.id,
      },
    });

    if (!membership) {
      await roomUserRepository.save(
        roomUserRepository.create({
          roomId: room.id,
          userId: user.id,
        }),
      );
    }
  }

  const seedMatches = [
    {
      teamA: 'España',
      teamB: 'Cabo Verde',
      matchDate: '2026-06-15T12:00:00-04:00',
      realResult: '0-0',
      predictions: {
        salva: { score: '3-0', points: 0 },
        josue: { score: '5-0', points: 0 },
        diego: { score: '6-0', points: 0 },
      },
    },
    {
      teamA: 'Bélgica',
      teamB: 'Egipto',
      matchDate: '2026-06-15T15:00:00-04:00',
      realResult: '1-1',
      predictions: {
        salva: { score: '2-0', points: 0 },
        josue: { score: '3-1', points: 0 },
        diego: { score: '2-0', points: 0 },
      },
    },
    {
      teamA: 'Arabia Saudita',
      teamB: 'Uruguay',
      matchDate: '2026-06-15T18:00:00-04:00',
      realResult: '1-1',
      predictions: {
        salva: { score: '2-1', points: 0 },
        josue: { score: '2-2', points: 1 },
        diego: { score: '1-1', points: 3 },
      },
    },
    {
      teamA: 'Irán',
      teamB: 'Nueva Zelanda',
      matchDate: '2026-06-15T21:00:00-04:00',
      realResult: '2-2',
      predictions: {
        salva: { score: '2-0', points: 0 },
        josue: { score: '0-0', points: 1 },
        diego: { score: '1-1', points: 1 },
      },
    },
    {
      teamA: 'Francia',
      teamB: 'Senegal',
      matchDate: '2026-06-16T15:00:00-04:00',
      realResult: '3-1',
      predictions: {
        salva: { score: '2-0', points: 1 },
        josue: { score: '3-0', points: 1 },
        diego: { score: '3-1', points: 3 },
      },
    },
    {
      teamA: 'Irak',
      teamB: 'Noruega',
      matchDate: '2026-06-16T18:00:00-04:00',
      realResult: '1-4',
      predictions: {
        salva: { score: '1-2', points: 1 },
        josue: { score: '0-2', points: 1 },
        diego: { score: '0-3', points: 1 },
      },
    },
    {
      teamA: 'Argentina',
      teamB: 'Argelia',
      matchDate: '2026-06-16T21:00:00-04:00',
      realResult: '3-0',
      predictions: {
        salva: { score: '2-2', points: 0 },
        josue: { score: '2-0', points: 1 },
        diego: { score: '2-0', points: 1 },
      },
    },
    {
      teamA: 'Austria',
      teamB: 'Jordania',
      matchDate: '2026-06-17T00:00:00-04:00',
      realResult: '3-1',
      predictions: {
        salva: { score: '1-1', points: 0 },
        josue: { score: '3-1', points: 3 },
        diego: { score: '2-1', points: 1 },
      },
    },
    {
      teamA: 'Portugal',
      teamB: 'Congo',
      matchDate: '2026-06-17T13:00:00-04:00',
      predictions: {
        salva: { score: '4-1' },
        josue: { score: '3-0' },
        diego: { score: '2-1' },
      },
    },
    {
      teamA: 'Inglaterra',
      teamB: 'Croacia',
      matchDate: '2026-06-17T16:00:00-04:00',
      predictions: {
        salva: { score: '2-2' },
        josue: { score: '2-3' },
        diego: { score: '3-1' },
      },
    },
    {
      teamA: 'Ghana',
      teamB: 'Panamá',
      matchDate: '2026-06-17T19:00:00-04:00',
      predictions: {
        salva: { score: '3-0' },
        josue: { score: '3-0' },
        diego: { score: '2-0' },
      },
    },
    {
      teamA: 'Uzbekistan',
      teamB: 'Colombia',
      matchDate: '2026-06-17T22:00:00-04:00',
      predictions: {
        salva: { score: '1-3' },
        josue: { score: '0-3' },
        diego: { score: '1-2' },
      },
    },
  ];

  await predictionRepository
    .createQueryBuilder()
    .delete()
    .where(
      `"matchId" IN (
        SELECT id FROM matches WHERE "roomId" = :roomId
      )`,
      { roomId: room.id },
    )
    .execute();

  await matchRepository.delete({ roomId: room.id });

  const userByUsername = new Map(users.map((user) => [user.username, user]));

  for (const seedMatch of seedMatches) {
    const realResult = seedMatch.realResult
      ? parseScore(seedMatch.realResult)
      : null;

    const match = await matchRepository.save(
      matchRepository.create({
        roomId: room.id,
        teamA: seedMatch.teamA,
        teamB: seedMatch.teamB,
        matchDate: new Date(seedMatch.matchDate),
        teamAScore: realResult?.teamAScore ?? null,
        teamBScore: realResult?.teamBScore ?? null,
        status: realResult ? MatchStatus.FINISHED : MatchStatus.SCHEDULED,
        isActive: true,
      }),
    );

    for (const [username, predictionData] of Object.entries(seedMatch.predictions)) {
      const user = userByUsername.get(username);

      if (!user) {
        continue;
      }

      const predictedResult = parseScore(predictionData.score);

      await predictionRepository.save(
        predictionRepository.create({
          userId: user.id,
          matchId: match.id,
          predictedTeamAScore: predictedResult.teamAScore,
          predictedTeamBScore: predictedResult.teamBScore,
          points: predictionData.points ?? null,
          isCalculated: predictionData.points !== undefined,
        }),
      );
    }
  }

  await app.close();

  console.log('Seed completed successfully');
}

runSeed().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exitCode = 1;
});
