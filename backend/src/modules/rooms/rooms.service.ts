import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ScoringService } from '../scoring/scoring.service';
import { UsersService } from '../users/users.service';
import { AddRoomMemberDto } from './dto/add-room-member.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomMember } from './entities/room-member.entity';
import { Room } from './entities/room.entity';

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(Room)
    private readonly roomsRepository: Repository<Room>,
    @InjectRepository(RoomMember)
    private readonly roomMembersRepository: Repository<RoomMember>,
    private readonly usersService: UsersService,
    private readonly scoringService: ScoringService,
  ) {}

  async getMyRooms(userId: string) {
    const memberships = await this.roomMembersRepository.find({
      where: { userId },
      relations: {
        room: true,
      },
      order: {
        room: {
          name: 'ASC',
        },
      },
    });

    return memberships.map((membership) => this.toRoomSummary(membership.room));
  }

  async getRoomByIdForUser(roomId: string, userId: string) {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
      relations: {
        members: {
          user: true,
        },
      },
      order: {
        members: {
          joinedAt: 'ASC',
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    const isMember = room.members.some((member) => member.userId === userId);

    if (!isMember) {
      throw new ForbiddenException('You do not belong to this room.');
    }

    return this.toRoomDetail(room);
  }

  async getLeaderboardForUser(roomId: string, userId: string) {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    await this.ensureRoomMember(roomId, userId);

    return this.scoringService.getRoomLeaderboard(roomId);
  }

  async findRoomById(roomId: string) {
    return this.roomsRepository.findOne({
      where: { id: roomId },
    });
  }

  async ensureRoomMember(roomId: string, userId: string) {
    const membership = await this.roomMembersRepository.findOne({
      where: {
        roomId,
        userId,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not belong to this room.');
    }

    return membership;
  }

  async createRoom(createRoomDto: CreateRoomDto, createdByUserId: string) {
    const existingRoom = await this.roomsRepository.findOne({
      where: { code: createRoomDto.code },
    });

    if (existingRoom) {
      throw new ConflictException('Room code already exists.');
    }

    const room = this.roomsRepository.create({
      name: createRoomDto.name,
      code: createRoomDto.code,
      isActive: createRoomDto.isActive ?? true,
      createdByUserId,
    });

    const savedRoom = await this.roomsRepository.save(room);

    return this.toRoomSummary(savedRoom);
  }

  async addMemberToRoom(roomId: string, addRoomMemberDto: AddRoomMemberDto) {
    const room = await this.roomsRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    if (!room.isActive) {
      throw new ConflictException('Room is inactive.');
    }

    const user = await this.usersService.findById(addRoomMemberDto.userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const existingMembership = await this.roomMembersRepository.findOne({
      where: {
        roomId,
        userId: addRoomMemberDto.userId,
      },
    });

    if (existingMembership) {
      throw new ConflictException('User is already a member of this room.');
    }

    const membership = this.roomMembersRepository.create({
      roomId,
      userId: addRoomMemberDto.userId,
    });

    const savedMembership = await this.roomMembersRepository.save(membership);

    return {
      id: savedMembership.id,
      roomId: savedMembership.roomId,
      user: this.usersService.sanitizeUser(user),
      joinedAt: savedMembership.joinedAt,
    };
  }

  private toRoomSummary(room: Room) {
    return {
      id: room.id,
      name: room.name,
      code: room.code,
      isActive: room.isActive,
      createdByUserId: room.createdByUserId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  private toRoomDetail(room: Room) {
    return {
      ...this.toRoomSummary(room),
      members: room.members.map((member) => ({
        id: member.id,
        joinedAt: member.joinedAt,
        user: this.usersService.sanitizeUser(member.user),
      })),
    };
  }
}
