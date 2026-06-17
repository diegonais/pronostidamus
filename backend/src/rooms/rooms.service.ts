import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';
import { RoomUser } from './entities/room-user.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    @InjectRepository(RoomUser)
    private readonly roomUsersRepository: Repository<RoomUser>,
    private readonly usersService: UsersService,
  ) {}

  async create(createRoomDto: CreateRoomDto): Promise<Room> {
    const room = this.roomsRepository.create({
      ...createRoomDto,
      name: createRoomDto.name.trim(),
    });

    return this.roomsRepository.save(room);
  }

  findAll(): Promise<Room[]> {
    return this.roomsRepository.find({
      relations: {
        roomUsers: {
          user: true,
        },
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomsRepository.findOne({
      where: { id },
      relations: {
        roomUsers: {
          user: true,
        },
        matches: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with id ${id} was not found`);
    }

    return room;
  }

  async update(id: string, updateRoomDto: UpdateRoomDto): Promise<Room> {
    const room = await this.findOne(id);

    Object.assign(room, {
      ...updateRoomDto,
      name: updateRoomDto.name?.trim() ?? room.name,
    });

    return this.roomsRepository.save(room);
  }

  async addUser(roomId: string, userId: string): Promise<RoomUser> {
    await this.findOne(roomId);
    await this.usersService.findOne(userId);

    const existingMembership = await this.roomUsersRepository.findOne({
      where: { roomId, userId },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this room');
    }

    const roomUser = this.roomUsersRepository.create({
      roomId,
      userId,
    });

    return this.roomUsersRepository.save(roomUser);
  }

  async removeUser(
    roomId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const roomUser = await this.roomUsersRepository.findOne({
      where: { roomId, userId },
    });

    if (!roomUser) {
      throw new NotFoundException('Room membership was not found');
    }

    await this.roomUsersRepository.remove(roomUser);

    return { message: 'User removed from room successfully' };
  }

  async ensureUserBelongsToRoom(roomId: string, userId: string): Promise<void> {
    const roomUser = await this.roomUsersRepository.findOne({
      where: { roomId, userId },
    });

    if (!roomUser) {
      throw new ConflictException(
        'User must belong to the room before creating a prediction',
      );
    }
  }
}
