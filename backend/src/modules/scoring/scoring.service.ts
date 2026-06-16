import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';

import { MatchStatus } from '../../common/enums/match-status.enum';
import { Match } from '../matches/entities/match.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { RoomMember } from '../rooms/entities/room-member.entity';

type MatchOutcome = 'home' | 'away' | 'draw';

@Injectable()
export class ScoringService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    @InjectRepository(Prediction)
    private readonly predictionsRepository: Repository<Prediction>,
    @InjectRepository(RoomMember)
    private readonly roomMembersRepository: Repository<RoomMember>,
  ) {}

  calculatePoints(
    predictedHomeScore: number,
    predictedAwayScore: number,
    homeScore: number,
    awayScore: number,
  ) {
    if (
      predictedHomeScore === homeScore &&
      predictedAwayScore === awayScore
    ) {
      return 3;
    }

    const predictedOutcome = this.getOutcome(
      predictedHomeScore,
      predictedAwayScore,
    );
    const realOutcome = this.getOutcome(homeScore, awayScore);

    if (predictedOutcome === realOutcome) {
      return 1;
    }

    return 0;
  }

  async calculatePointsForMatch(matchId: string) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    this.ensureMatchCanBeScored(match);

    const predictions = await this.predictionsRepository.find({
      where: { matchId },
    });

    for (const prediction of predictions) {
      prediction.points = this.calculatePoints(
        prediction.predictedHomeScore,
        prediction.predictedAwayScore,
        match.homeScore as number,
        match.awayScore as number,
      );
    }

    if (predictions.length > 0) {
      await this.predictionsRepository.save(predictions);
    }

    return {
      matchId: match.id,
      processedPredictions: predictions.length,
    };
  }

  async calculatePointsForFinishedMatches() {
    const matches = await this.matchesRepository.find({
      where: {
        status: MatchStatus.FINISHED,
        homeScore: Not(IsNull()),
        awayScore: Not(IsNull()),
      },
    });

    const results = [];

    for (const match of matches) {
      const result = await this.calculatePointsForMatch(match.id);
      results.push(result);
    }

    return {
      processedMatches: matches.length,
      results,
    };
  }

  async synchronizeMatchPoints(matchId: string) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    if (this.canBeScored(match)) {
      return this.calculatePointsForMatch(match.id);
    }

    await this.clearPointsForMatch(match.id);

    return {
      matchId: match.id,
      processedPredictions: 0,
    };
  }

  async getRoomLeaderboard(roomId: string) {
    const memberships = await this.roomMembersRepository.find({
      where: { roomId },
      relations: {
        user: true,
      },
    });

    const predictions = await this.predictionsRepository.find({
      where: { roomId },
    });

    const predictionsByUserId = new Map<string, Prediction[]>();

    for (const prediction of predictions) {
      const userPredictions = predictionsByUserId.get(prediction.userId) ?? [];
      userPredictions.push(prediction);
      predictionsByUserId.set(prediction.userId, userPredictions);
    }

    const leaderboard = memberships.map((membership) => {
      const userPredictions = predictionsByUserId.get(membership.userId) ?? [];

      const totalPoints = userPredictions.reduce(
        (sum, prediction) => sum + (prediction.points ?? 0),
        0,
      );
      const exactHits = userPredictions.filter(
        (prediction) => prediction.points === 3,
      ).length;
      const simpleHits = userPredictions.filter(
        (prediction) => prediction.points === 1,
      ).length;
      const failedPredictions = userPredictions.filter(
        (prediction) => prediction.points === 0,
      ).length;

      return {
        userId: membership.user.id,
        username: membership.user.username,
        totalPoints,
        exactHits,
        simpleHits,
        failedPredictions,
        totalPredictions: userPredictions.length,
      };
    });

    leaderboard.sort((left, right) => {
      if (right.totalPoints !== left.totalPoints) {
        return right.totalPoints - left.totalPoints;
      }

      if (right.exactHits !== left.exactHits) {
        return right.exactHits - left.exactHits;
      }

      if (right.simpleHits !== left.simpleHits) {
        return right.simpleHits - left.simpleHits;
      }

      return left.username.localeCompare(right.username);
    });

    return leaderboard;
  }

  private async clearPointsForMatch(matchId: string) {
    await this.predictionsRepository.update({ matchId }, { points: null });
  }

  private ensureMatchCanBeScored(match: Match) {
    if (!this.canBeScored(match)) {
      throw new BadRequestException(
        'Points can only be calculated for finished matches with valid scores.',
      );
    }
  }

  private canBeScored(match: Match) {
    return (
      match.status === MatchStatus.FINISHED &&
      match.homeScore !== null &&
      match.awayScore !== null &&
      match.homeScore >= 0 &&
      match.awayScore >= 0
    );
  }

  private getOutcome(homeScore: number, awayScore: number): MatchOutcome {
    if (homeScore > awayScore) {
      return 'home';
    }

    if (homeScore < awayScore) {
      return 'away';
    }

    return 'draw';
  }
}
