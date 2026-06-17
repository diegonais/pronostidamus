import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchesService } from './matches.service';

@Injectable()
export class MatchesScheduler {
  private readonly logger = new Logger(MatchesScheduler.name);

  constructor(private readonly matchesService: MatchesService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async closeDueMatches() {
    const closedMatches = await this.matchesService.closeMatchesReadyForLocking();

    if (closedMatches > 0) {
      this.logger.log(
        `Closed predictions automatically for ${closedMatches} match(es)`,
      );
    }
  }
}
