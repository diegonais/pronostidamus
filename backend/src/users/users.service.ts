import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPassword } from '../auth/password.util';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    await this.ensureUniqueFields(createUserDto.email, createUserDto.username);

    const user = this.usersRepository.create({
      email: createUserDto.email.trim().toLowerCase(),
      username: createUserDto.username.trim().toLowerCase(),
      name: createUserDto.name.trim(),
      passwordHash: hashPassword(createUserDto.password),
      role: createUserDto.role,
      isActive: createUserDto.isActive,
    });

    const savedUser = await this.usersRepository.save(user);
    return this.findOne(savedUser.id);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} was not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);

    if (updateUserDto.email || updateUserDto.username) {
      await this.ensureUniqueFields(
        updateUserDto.email ?? user.email,
        updateUserDto.username ?? user.username,
        id,
      );
    }

    const nextValues: Partial<User> = {
      email: updateUserDto.email?.trim().toLowerCase() ?? user.email,
      username: updateUserDto.username?.trim().toLowerCase() ?? user.username,
      name: updateUserDto.name?.trim() ?? user.name,
      role: updateUserDto.role ?? user.role,
      isActive: updateUserDto.isActive ?? user.isActive,
    };

    if (updateUserDto.password?.trim()) {
      nextValues.passwordHash = hashPassword(updateUserDto.password);
    }

    Object.assign(user, nextValues);

    const savedUser = await this.usersRepository.save(user);
    return this.findOne(savedUser.id);
  }

  async findActiveByUsername(
    username: string,
  ): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('LOWER(user.username) = :username', {
        username: username.trim().toLowerCase(),
      })
      .andWhere('user.isActive = :isActive', { isActive: true })
      .getOne();
  }

  private async ensureUniqueFields(
    email: string,
    username: string,
    ignoreUserId?: string,
  ): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedUsername = username.trim().toLowerCase();

    const existingUser = await this.usersRepository
      .createQueryBuilder('user')
      .where(
        '(LOWER(user.email) = :email OR LOWER(user.username) = :username)',
        {
          email: normalizedEmail,
          username: normalizedUsername,
        },
      )
      .andWhere(ignoreUserId ? 'user.id != :ignoreUserId' : '1=1', {
        ignoreUserId,
      })
      .getOne();

    if (!existingUser) {
      return;
    }

    if (existingUser.email.toLowerCase() === normalizedEmail) {
      throw new ConflictException(`Email ${normalizedEmail} is already in use`);
    }

    throw new ConflictException(
      `Username ${normalizedUsername} is already in use`,
    );
  }
}
