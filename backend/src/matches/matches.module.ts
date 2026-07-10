import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Prediction } from '../predictions/entities/prediction.entity';
import { RoomsModule } from '../rooms/rooms.module';
import { Team } from '../teams/entities/team.entity';
import { Match } from './entities/match.entity';
import { MatchesController } from './matches.controller';
import { MatchesScheduler } from './matches.scheduler';
import { MatchesService } from './matches.service';

@Module({
  imports: [TypeOrmModule.forFeature([Match, Prediction, Team]), RoomsModule],
  controllers: [MatchesController],
  providers: [MatchesService, MatchesScheduler],
  exports: [MatchesService, TypeOrmModule],
})
export class MatchesModule {}
