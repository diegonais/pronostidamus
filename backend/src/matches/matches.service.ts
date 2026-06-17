import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { MatchStatus } from '../common/enums/match-status.enum';
import { Prediction } from '../predictions/entities/prediction.entity';
import { RoomsService } from '../rooms/rooms.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { Match } from './entities/match.entity';

@Injectable()
export class MatchesService {
  private static readonly PREDICTION_LOCK_OFFSET_MS = 5 * 60 * 1000;

  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(Prediction)
    private readonly predictionsRepository: Repository<Prediction>,
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

    const savedMatch = await this.matchesRepository.save(match);
    await this.syncOperationalStatus(savedMatch);
    await this.syncPredictionScores(savedMatch);
    return this.findOne(savedMatch.id);
  }

  async findByRoom(roomId: string): Promise<Match[]> {
    await this.closeMatchesReadyForLocking();

    return this.matchesRepository.find({
      where: { roomId },
      order: {
        matchDate: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Match> {
    await this.closeMatchesReadyForLocking();

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

    const savedMatch = await this.matchesRepository.save(match);
    await this.syncOperationalStatus(savedMatch);
    await this.syncPredictionScores(savedMatch);
    return this.findOne(savedMatch.id);
  }

  isPredictionClosed(match: Pick<Match, 'matchDate' | 'status'>): boolean {
    if (match.status === MatchStatus.CLOSED || match.status === MatchStatus.FINISHED) {
      return true;
    }

    return (
      Date.now() >=
      new Date(match.matchDate).getTime() -
        MatchesService.PREDICTION_LOCK_OFFSET_MS
    );
  }

  async closeMatchesReadyForLocking(): Promise<number> {
    const lockThreshold = new Date(
      Date.now() + MatchesService.PREDICTION_LOCK_OFFSET_MS,
    );

    const result = await this.matchesRepository.update(
      {
        status: MatchStatus.SCHEDULED,
        matchDate: LessThanOrEqual(lockThreshold),
      },
      {
        status: MatchStatus.CLOSED,
      },
    );

    return result.affected ?? 0;
  }

  private async syncOperationalStatus(match: Match): Promise<void> {
    const nextStatus = this.getOperationalStatus(match);

    if (nextStatus === match.status) {
      return;
    }

    match.status = nextStatus;
    await this.matchesRepository.save(match);
  }

  private async syncPredictionScores(match: Match): Promise<void> {
    const predictions = await this.predictionsRepository.find({
      where: { matchId: match.id },
    });

    if (predictions.length === 0) {
      return;
    }

    const hasFinalResult =
      match.status === MatchStatus.FINISHED &&
      match.teamAScore !== null &&
      match.teamBScore !== null;

    const nextPredictions = predictions.map((prediction) => {
      if (!hasFinalResult) {
        prediction.points = null;
        prediction.isCalculated = false;
        return prediction;
      }

      const finalTeamAScore = match.teamAScore as number;
      const finalTeamBScore = match.teamBScore as number;

      prediction.points = this.calculatePredictionPoints(
        prediction,
        finalTeamAScore,
        finalTeamBScore,
      );
      prediction.isCalculated = true;
      return prediction;
    });

    await this.predictionsRepository.save(nextPredictions);
  }

  private calculatePredictionPoints(
    prediction: Pick<Prediction, 'predictedTeamAScore' | 'predictedTeamBScore'>,
    teamAScore: number,
    teamBScore: number,
  ): number {
    if (
      prediction.predictedTeamAScore === teamAScore &&
      prediction.predictedTeamBScore === teamBScore
    ) {
      return 3;
    }

    if (
      this.getOutcome(prediction.predictedTeamAScore, prediction.predictedTeamBScore) ===
      this.getOutcome(teamAScore, teamBScore)
    ) {
      return 1;
    }

    return 0;
  }

  private getOutcome(teamAScore: number, teamBScore: number): 'A' | 'B' | 'D' {
    if (teamAScore === teamBScore) {
      return 'D';
    }

    return teamAScore > teamBScore ? 'A' : 'B';
  }

  private getOperationalStatus(
    match: Pick<Match, 'matchDate' | 'status'>,
  ): MatchStatus {
    if (match.status === MatchStatus.FINISHED) {
      return MatchStatus.FINISHED;
    }

    if (match.status === MatchStatus.CLOSED) {
      return MatchStatus.CLOSED;
    }

    return this.isPredictionClosed(match)
      ? MatchStatus.CLOSED
      : MatchStatus.SCHEDULED;
  }
}
