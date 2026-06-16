import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

import { UserRole } from '../common/enums/user-role.enum';
import { getDatabaseConfig } from '../config/database.config';
import { RoomMember } from '../modules/rooms/entities/room-member.entity';
import { Room } from '../modules/rooms/entities/room.entity';
import { User } from '../modules/users/entities/user.entity';

interface SeedUser {
  username: string;
  password: string;
  roles: UserRole[];
  isActive: boolean;
}

const seedUsers: SeedUser[] = [
  {
    username: 'diego',
    password: 'diego123',
    roles: [UserRole.USER, UserRole.ADMIN],
    isActive: true,
  },
  {
    username: 'salva',
    password: 'salva123',
    roles: [UserRole.USER],
    isActive: true,
  },
  {
    username: 'josue',
    password: 'josue123',
    roles: [UserRole.USER],
    isActive: true,
  },
  {
    username: 'paolo',
    password: 'paolo123',
    roles: [UserRole.USER],
    isActive: true,
  },
];

const initialRoom = {
  name: 'pronostidamus mundialcillo',
  code: 'PRONOSTIDAMUS-MUNDIALCILLO',
  isActive: true,
  createdByUsername: 'diego',
};

function areRolesEqual(currentRoles: UserRole[], nextRoles: UserRole[]): boolean {
  if (currentRoles.length !== nextRoles.length) {
    return false;
  }

  return currentRoles.every((role, index) => role === nextRoles[index]);
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
    }),
  ],
})
class SeedModule {}

async function runSeed() {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(SeedModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const dataSource = app.get(DataSource);

    await dataSource.transaction(async (manager) => {
      const usersRepository = manager.getRepository(User);
      const roomsRepository = manager.getRepository(Room);
      const roomMembersRepository = manager.getRepository(RoomMember);

      const usersByUsername = new Map<string, User>();

      for (const seedUser of seedUsers) {
        const existingUser = await usersRepository.findOne({
          where: { username: seedUser.username },
        });

        if (!existingUser) {
          const passwordHash = await bcrypt.hash(seedUser.password, 10);
          const createdUser = usersRepository.create({
            username: seedUser.username,
            passwordHash,
            roles: seedUser.roles,
            isActive: seedUser.isActive,
          });

          const savedUser = await usersRepository.save(createdUser);
          usersByUsername.set(savedUser.username, savedUser);
          logger.log(`Created user "${savedUser.username}".`);
          continue;
        }

        const passwordMatches = await bcrypt.compare(
          seedUser.password,
          existingUser.passwordHash,
        );

        const requiresUpdate =
          !passwordMatches ||
          existingUser.isActive !== seedUser.isActive ||
          !areRolesEqual(existingUser.roles, seedUser.roles);

        if (requiresUpdate) {
          existingUser.passwordHash = await bcrypt.hash(seedUser.password, 10);
          existingUser.roles = seedUser.roles;
          existingUser.isActive = seedUser.isActive;

          const updatedUser = await usersRepository.save(existingUser);
          usersByUsername.set(updatedUser.username, updatedUser);
          logger.log(`Updated user "${updatedUser.username}".`);
          continue;
        }

        usersByUsername.set(existingUser.username, existingUser);
        logger.log(`User "${existingUser.username}" already up to date.`);
      }

      const createdByUser = usersByUsername.get(initialRoom.createdByUsername);

      if (!createdByUser) {
        throw new Error(
          `Seed user "${initialRoom.createdByUsername}" was not created.`,
        );
      }

      const existingRoom = await roomsRepository.findOne({
        where: { code: initialRoom.code },
      });

      let room: Room;

      if (!existingRoom) {
        const createdRoom = roomsRepository.create({
          name: initialRoom.name,
          code: initialRoom.code,
          isActive: initialRoom.isActive,
          createdByUserId: createdByUser.id,
        });

        room = await roomsRepository.save(createdRoom);
        logger.log(`Created room "${room.code}".`);
      } else {
        const requiresUpdate =
          existingRoom.name !== initialRoom.name ||
          existingRoom.isActive !== initialRoom.isActive ||
          existingRoom.createdByUserId !== createdByUser.id;

        if (requiresUpdate) {
          existingRoom.name = initialRoom.name;
          existingRoom.isActive = initialRoom.isActive;
          existingRoom.createdByUserId = createdByUser.id;

          room = await roomsRepository.save(existingRoom);
          logger.log(`Updated room "${room.code}".`);
        } else {
          room = existingRoom;
          logger.log(`Room "${room.code}" already up to date.`);
        }
      }

      const existingMembers = await roomMembersRepository.find({
        where: { roomId: room.id },
      });
      const existingMemberUserIds = new Set(
        existingMembers.map((member) => member.userId),
      );

      for (const seedUser of seedUsers) {
        const user = usersByUsername.get(seedUser.username);

        if (!user) {
          throw new Error(`Seed user "${seedUser.username}" was not found.`);
        }

        if (existingMemberUserIds.has(user.id)) {
          logger.log(
            `Membership already exists for user "${user.username}" in room "${room.code}".`,
          );
          continue;
        }

        const membership = roomMembersRepository.create({
          roomId: room.id,
          userId: user.id,
        });

        await roomMembersRepository.save(membership);
        logger.log(
          `Added user "${user.username}" to room "${room.code}".`,
        );
      }
    });

    logger.log('Seed finished successfully.');
  } finally {
    await app.close();
  }
}

void runSeed();
