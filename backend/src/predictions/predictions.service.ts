import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchesService } from '../matches/matches.service';
import { RoomsService } from '../rooms/rooms.service';
import { UsersService } from '../users/users.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { Prediction } from './entities/prediction.entity';

@Injectable()
export class PredictionsService {
  constructor(
    @InjectRepository(Prediction)
    private readonly predictionsRepository: Repository<Prediction>,
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
  ) {}

  async create(
    matchId: string,
    createPredictionDto: CreatePredictionDto,
  ): Promise<Prediction> {
    const match = await this.matchesService.findOne(matchId);
    await this.usersService.findOne(createPredictionDto.userId);
    await this.roomsService.ensureUserBelongsToRoom(
      match.roomId,
      createPredictionDto.userId,
    );

    const existingPrediction = await this.predictionsRepository.findOne({
      where: {
        matchId,
        userId: createPredictionDto.userId,
      },
    });

    if (existingPrediction) {
      throw new ConflictException(
        'This user already has a prediction for the selected match',
      );
    }

    const prediction = this.predictionsRepository.create({
      ...createPredictionDto,
      matchId,
    });

    return this.predictionsRepository.save(prediction);
  }

  findByMatch(matchId: string): Promise<Prediction[]> {
    return this.predictionsRepository.find({
      where: { matchId },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Prediction> {
    const prediction = await this.predictionsRepository.findOne({
      where: { id },
      relations: {
        user: true,
        match: true,
      },
    });

    if (!prediction) {
      throw new NotFoundException(`Prediction with id ${id} was not found`);
    }

    return prediction;
  }

  async update(
    id: string,
    updatePredictionDto: UpdatePredictionDto,
  ): Promise<Prediction> {
    const prediction = await this.findOne(id);

    Object.assign(prediction, updatePredictionDto);

    return this.predictionsRepository.save(prediction);
  }
}
