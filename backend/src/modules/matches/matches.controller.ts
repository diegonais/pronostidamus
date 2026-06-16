import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MatchesService } from './matches.service';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get()
  getMatches() {
    return this.matchesService.getMatches();
  }

  @Get(':matchId')
  getMatchById(@Param('matchId') matchId: string) {
    return this.matchesService.getMatchById(matchId);
  }
}
