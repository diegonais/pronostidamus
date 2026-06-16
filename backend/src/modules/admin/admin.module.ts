import { Module } from '@nestjs/common';

import { MatchesModule } from '../matches/matches.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ScoringModule } from '../scoring/scoring.module';
import { TeamsModule } from '../teams/teams.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, RoomsModule, TeamsModule, MatchesModule, ScoringModule],
  controllers: [AdminController],
})
export class AdminModule {}
