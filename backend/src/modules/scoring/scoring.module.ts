import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Match } from '../matches/entities/match.entity';
import { Prediction } from '../predictions/entities/prediction.entity';
import { RoomMember } from '../rooms/entities/room-member.entity';
import { ScoringService } from './scoring.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Prediction, RoomMember])],
  providers: [ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
