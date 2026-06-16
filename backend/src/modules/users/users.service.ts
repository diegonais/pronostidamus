import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '../../common/enums/user-role.enum';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { User } from './entities/user.entity';

interface UpdateUserInput {
  username?: string;
  roles?: UserRole[];
  isActive?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        username: 'ASC',
      },
    });
  }

  async updateUserByAdmin(
    userId: string,
    updateUserInput: UpdateUserInput,
  ): Promise<User> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (
      updateUserInput.username &&
      updateUserInput.username !== user.username
    ) {
      const existingUser = await this.findByUsername(updateUserInput.username);

      if (existingUser) {
        throw new ConflictException('Username already exists.');
      }

      user.username = updateUserInput.username;
    }

    if (updateUserInput.roles) {
      user.roles = updateUserInput.roles;
    }

    if (typeof updateUserInput.isActive === 'boolean') {
      user.isActive = updateUserInput.isActive;
    }

    return this.usersRepository.save(user);
  }

  sanitizeUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      username: user.username,
      roles: user.roles,
      isActive: user.isActive,
    };
  }

  toAdminUserResponse(user: User) {
    return {
      id: user.id,
      username: user.username,
      roles: user.roles,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
