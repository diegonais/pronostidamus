import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { Match } from '../../matches/entities/match.entity';
import { Room } from '../../rooms/entities/room.entity';
import { RoomUser } from '../../rooms/entities/room-user.entity';
import { User } from '../../users/entities/user.entity';

async function runSeed() {
  process.env.TZ = process.env.TZ ?? 'America/La_Paz';

  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const userRepository = dataSource.getRepository(User);
  const roomRepository = dataSource.getRepository(Room);
  const roomUserRepository = dataSource.getRepository(RoomUser);
  const matchRepository = dataSource.getRepository(Match);

  const seedUsers = [
    {
      name: 'Diego Armando',
      username: 'diego',
      email: 'diego@example.com',
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      name: 'Salva',
      username: 'salva',
      email: 'salva@example.com',
      role: UserRole.USER,
      isActive: true,
    },
    {
      name: 'Josue',
      username: 'josue',
      email: 'josue@example.com',
      role: UserRole.USER,
      isActive: true,
    },
    {
      name: 'Paolo',
      username: 'paolo',
      email: 'paolo@example.com',
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
      user = userRepository.create(seedUser);
      user = await userRepository.save(user);
    }

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
      teamA: 'Bolivia',
      teamB: 'Chile',
      matchDate: '2026-06-20T20:00:00-04:00',
    },
    {
      teamA: 'Argentina',
      teamB: 'Brasil',
      matchDate: '2026-06-21T20:00:00-04:00',
    },
    {
      teamA: 'Espana',
      teamB: 'Alemania',
      matchDate: '2026-06-22T20:00:00-04:00',
    },
  ];

  for (const seedMatch of seedMatches) {
    const existingMatch = await matchRepository.findOne({
      where: {
        roomId: room.id,
        teamA: seedMatch.teamA,
        teamB: seedMatch.teamB,
      },
    });

    if (!existingMatch) {
      await matchRepository.save(
        matchRepository.create({
          ...seedMatch,
          roomId: room.id,
          matchDate: new Date(seedMatch.matchDate),
          status: MatchStatus.SCHEDULED,
          isActive: true,
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
