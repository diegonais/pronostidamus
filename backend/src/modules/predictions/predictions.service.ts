import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MatchStatus } from '../../common/enums/match-status.enum';
import { MatchesService } from '../matches/matches.service';
import { toMatchResponse } from '../matches/utils/match-response.util';
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
    private readonly roomsService: RoomsService,
    private readonly matchesService: MatchesService,
    private readonly usersService: UsersService,
  ) {}

  async getMyPredictions(roomId: string, userId: string) {
    await this.ensurePredictionAccess(roomId, userId);

    const predictions = await this.predictionsRepository.find({
      where: {
        roomId,
        userId,
      },
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
        },
      },
      order: {
        match: {
          matchDate: 'ASC',
          createdAt: 'ASC',
        },
      },
    });

    return predictions.map((prediction) => this.toPredictionResponse(prediction));
  }

  async getMyPredictionForMatch(roomId: string, matchId: string, userId: string) {
    await this.ensurePredictionAccess(roomId, userId);
    await this.matchesService.findMatchEntityOrFail(matchId);

    const prediction = await this.predictionsRepository.findOne({
      where: {
        roomId,
        userId,
        matchId,
      },
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    });

    if (!prediction) {
      return null;
    }

    return this.toPredictionResponse(prediction);
  }

  async createPrediction(
    roomId: string,
    matchId: string,
    userId: string,
    createPredictionDto: CreatePredictionDto,
  ) {
    await this.ensurePredictionAccess(roomId, userId);
    const match = await this.validateMatchForPrediction(matchId);

    const existingPrediction = await this.predictionsRepository.findOne({
      where: {
        roomId,
        userId,
        matchId,
      },
    });

    if (existingPrediction) {
      throw new ConflictException('Prediction already exists for this match.');
    }

    const prediction = this.predictionsRepository.create({
      roomId,
      userId,
      matchId,
      predictedHomeScore: createPredictionDto.predictedHomeScore,
      predictedAwayScore: createPredictionDto.predictedAwayScore,
      points: null,
    });

    await this.predictionsRepository.save(prediction);

    const savedPrediction = await this.predictionsRepository.findOne({
      where: { id: prediction.id },
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    });

    if (!savedPrediction) {
      throw new NotFoundException('Prediction not found.');
    }

    return this.toPredictionResponse(savedPrediction);
  }

  async updatePrediction(
    roomId: string,
    matchId: string,
    userId: string,
    updatePredictionDto: UpdatePredictionDto,
  ) {
    await this.ensurePredictionAccess(roomId, userId);
    await this.validateMatchForPrediction(matchId);

    const prediction = await this.predictionsRepository.findOne({
      where: {
        roomId,
        userId,
        matchId,
      },
      relations: {
        match: {
          homeTeam: true,
          awayTeam: true,
        },
      },
    });

    if (!prediction) {
      throw new NotFoundException('Prediction not found.');
    }

    prediction.predictedHomeScore = updatePredictionDto.predictedHomeScore;
    prediction.predictedAwayScore = updatePredictionDto.predictedAwayScore;

    await this.predictionsRepository.save(prediction);

    return this.toPredictionResponse(prediction);
  }

  private async ensurePredictionAccess(roomId: string, userId: string) {
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!user.isActive) {
      throw new ForbiddenException('User is inactive.');
    }

    const room = await this.roomsService.findRoomById(roomId);

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    if (!room.isActive) {
      throw new ConflictException('Room is inactive.');
    }

    await this.roomsService.ensureRoomMember(roomId, userId);
  }

  private async validateMatchForPrediction(matchId: string) {
    const match = await this.matchesService.findMatchEntityOrFail(matchId);

    if (match.status === MatchStatus.CANCELLED) {
      throw new BadRequestException(
        'Predictions are not allowed for cancelled matches.',
      );
    }

    if (
      match.status === MatchStatus.LIVE ||
      match.status === MatchStatus.FINISHED
    ) {
      throw new BadRequestException(
        'Predictions are only allowed for scheduled matches.',
      );
    }

    const predictionDeadline = new Date(match.matchDate.getTime() - 5 * 60 * 1000);

    if (new Date() >= predictionDeadline) {
      throw new BadRequestException(
        'Prediction deadline has passed for this match.',
      );
    }

    return match;
  }

  private toPredictionResponse(prediction: Prediction) {
    return {
      id: prediction.id,
      roomId: prediction.roomId,
      userId: prediction.userId,
      matchId: prediction.matchId,
      predictedHomeScore: prediction.predictedHomeScore,
      predictedAwayScore: prediction.predictedAwayScore,
      points: prediction.points,
      createdAt: prediction.createdAt,
      updatedAt: prediction.updatedAt,
      match: prediction.match ? toMatchResponse(prediction.match) : undefined,
    };
  }
}
