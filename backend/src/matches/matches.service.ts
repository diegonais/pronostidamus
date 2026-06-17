import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomsService } from '../rooms/rooms.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { Match } from './entities/match.entity';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    private readonly roomsService: RoomsService,
  ) {}

  async create(roomId: string, createMatchDto: CreateMatchDto): Promise<Match> {
    await this.roomsService.findOne(roomId);

    const match = this.matchesRepository.create({
      ...createMatchDto,
      roomId,
      teamA: createMatchDto.teamA.trim(),
      teamB: createMatchDto.teamB.trim(),
      matchDate: new Date(createMatchDto.matchDate),
    });

    return this.matchesRepository.save(match);
  }

  findByRoom(roomId: string): Promise<Match[]> {
    return this.matchesRepository.find({
      where: { roomId },
      order: {
        matchDate: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Match> {
    const match = await this.matchesRepository.findOne({
      where: { id },
      relations: {
        room: true,
        predictions: true,
      },
    });

    if (!match) {
      throw new NotFoundException(`Match with id ${id} was not found`);
    }

    return match;
  }

  async update(id: string, updateMatchDto: UpdateMatchDto): Promise<Match> {
    const match = await this.findOne(id);

    Object.assign(match, {
      ...updateMatchDto,
      teamA: updateMatchDto.teamA?.trim() ?? match.teamA,
      teamB: updateMatchDto.teamB?.trim() ?? match.teamB,
      matchDate: updateMatchDto.matchDate
        ? new Date(updateMatchDto.matchDate)
        : match.matchDate,
    });

    return this.matchesRepository.save(match);
  }
}
