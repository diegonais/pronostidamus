import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { MatchStatus } from '../../common/enums/match-status.enum';
import { TeamsService } from '../teams/teams.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { UpdateMatchDto } from './dto/update-match.dto';
import { UpdateMatchResultDto } from './dto/update-match-result.dto';
import { Match } from './entities/match.entity';
import { MatchTeamLookup } from './types/match-team-lookup.type';
import { ResolvedMatchTeams } from './types/resolved-match-teams.type';
import { toMatchResponse } from './utils/match-response.util';

@Injectable()
export class MatchesService {
  constructor(
    @InjectRepository(Match)
    private readonly matchesRepository: Repository<Match>,
    private readonly teamsService: TeamsService,
  ) {}

  async getMatches() {
    const matches = await this.matchesRepository.find({
      relations: {
        homeTeam: true,
        awayTeam: true,
      },
      order: {
        matchDate: 'ASC',
        createdAt: 'ASC',
      },
    });

    return matches.map((match) => toMatchResponse(match));
  }

  async getMatchById(matchId: string) {
    const match = await this.findMatchOrFail(matchId);

    return toMatchResponse(match);
  }

  async createMatch(createMatchDto: CreateMatchDto) {
    const resolvedTeams = await this.resolveTeamsFromInput(createMatchDto);

    await this.ensureNoDuplicateMatch({
      externalId: createMatchDto.externalId?.trim() || null,
      homeTeamId: resolvedTeams.homeTeam.id,
      awayTeamId: resolvedTeams.awayTeam.id,
      matchDate: new Date(createMatchDto.matchDate),
    });

    const match = this.matchesRepository.create({
      externalId: createMatchDto.externalId?.trim() || null,
      homeTeamId: resolvedTeams.homeTeam.id,
      awayTeamId: resolvedTeams.awayTeam.id,
      groupName: createMatchDto.groupName?.trim() || null,
      round: createMatchDto.round.trim(),
      matchDate: new Date(createMatchDto.matchDate),
      status: createMatchDto.status ?? MatchStatus.SCHEDULED,
      venue: createMatchDto.venue?.trim() || null,
    });

    const savedMatch = await this.matchesRepository.save(match);

    return this.getMatchById(savedMatch.id);
  }

  async updateMatch(matchId: string, updateMatchDto: UpdateMatchDto) {
    const match = await this.findMatchOrFail(matchId);
    const resolvedTeams = await this.resolveTeamsFromInput(updateMatchDto, match);

    const nextExternalId =
      updateMatchDto.externalId === undefined
        ? match.externalId
        : updateMatchDto.externalId?.trim() || null;
    const nextMatchDate =
      updateMatchDto.matchDate === undefined
        ? match.matchDate
        : new Date(updateMatchDto.matchDate);

    await this.ensureNoDuplicateMatch(
      {
        externalId: nextExternalId,
        homeTeamId: resolvedTeams.homeTeam.id,
        awayTeamId: resolvedTeams.awayTeam.id,
        matchDate: nextMatchDate,
      },
      match.id,
    );

    match.externalId = nextExternalId;
    match.homeTeamId = resolvedTeams.homeTeam.id;
    match.awayTeamId = resolvedTeams.awayTeam.id;
    match.groupName =
      updateMatchDto.groupName === undefined
        ? match.groupName
        : updateMatchDto.groupName?.trim() || null;
    match.round = updateMatchDto.round?.trim() ?? match.round;
    match.matchDate = nextMatchDate;
    match.status = updateMatchDto.status ?? match.status;
    match.venue =
      updateMatchDto.venue === undefined
        ? match.venue
        : updateMatchDto.venue?.trim() || null;

    await this.matchesRepository.save(match);

    return this.getMatchById(match.id);
  }

  async updateMatchResult(matchId: string, updateMatchResultDto: UpdateMatchResultDto) {
    const match = await this.findMatchOrFail(matchId);
    const nextStatus = updateMatchResultDto.status ?? MatchStatus.FINISHED;

    if (nextStatus === MatchStatus.CANCELLED) {
      throw new BadRequestException(
        'Cancelled matches cannot receive real results.',
      );
    }

    match.homeScore = updateMatchResultDto.homeScore;
    match.awayScore = updateMatchResultDto.awayScore;
    match.status = nextStatus;

    await this.matchesRepository.save(match);

    return this.getMatchById(match.id);
  }

  async importMatches(createMatchDtos: CreateMatchDto[]) {
    const importedMatches = [];

    for (const createMatchDto of createMatchDtos) {
      const existingMatch = await this.findExistingMatchByCreateDto(createMatchDto);

      if (existingMatch) {
        importedMatches.push({
          id: existingMatch.id,
          externalId: existingMatch.externalId,
          action: 'skipped',
        });
        continue;
      }

      const createdMatch = await this.createMatch(createMatchDto);

      importedMatches.push({
        id: createdMatch.id,
        externalId: createdMatch.externalId,
        action: 'created',
      });
    }

    return {
      total: createMatchDtos.length,
      created: importedMatches.filter((item) => item.action === 'created').length,
      skipped: importedMatches.filter((item) => item.action === 'skipped').length,
      items: importedMatches,
    };
  }

  private async findMatchOrFail(matchId: string) {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
      relations: {
        homeTeam: true,
        awayTeam: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found.');
    }

    return match;
  }

  private async findExistingMatchByCreateDto(createMatchDto: CreateMatchDto) {
    const externalId = createMatchDto.externalId?.trim() || null;

    if (externalId) {
      const existingMatchByExternalId = await this.matchesRepository.findOne({
        where: { externalId },
      });

      if (existingMatchByExternalId) {
        return existingMatchByExternalId;
      }
    }

    const resolvedTeams = await this.resolveTeamsForLookup(createMatchDto);
    const matchDate = new Date(createMatchDto.matchDate);

    return this.findDuplicateMatch({
      externalId,
      homeTeamId: resolvedTeams.homeTeam.id,
      awayTeamId: resolvedTeams.awayTeam.id,
      matchDate,
    });
  }

  private async resolveTeamsFromInput(
    matchInput: Pick<CreateMatchDto, 'homeTeamId' | 'homeTeam' | 'awayTeamId' | 'awayTeam'>,
    currentMatch?: Match,
  ): Promise<ResolvedMatchTeams> {
    const homeTeam = await this.resolveSingleTeam(
      matchInput.homeTeamId,
      matchInput.homeTeam,
      currentMatch?.homeTeamId,
    );
    const awayTeam = await this.resolveSingleTeam(
      matchInput.awayTeamId,
      matchInput.awayTeam,
      currentMatch?.awayTeamId,
    );

    if (homeTeam.id === awayTeam.id) {
      throw new BadRequestException(
        'Home team and away team must be different.',
      );
    }

    return {
      homeTeam,
      awayTeam,
    };
  }

  private async resolveTeamsForLookup(
    matchInput: Pick<CreateMatchDto, 'homeTeamId' | 'homeTeam' | 'awayTeamId' | 'awayTeam'>,
  ): Promise<{ homeTeam: MatchTeamLookup; awayTeam: MatchTeamLookup }> {
    const homeTeam = await this.resolveSingleTeamForLookup(
      matchInput.homeTeamId,
      matchInput.homeTeam,
    );
    const awayTeam = await this.resolveSingleTeamForLookup(
      matchInput.awayTeamId,
      matchInput.awayTeam,
    );

    if (homeTeam.id === awayTeam.id) {
      throw new BadRequestException(
        'Home team and away team must be different.',
      );
    }

    return {
      homeTeam,
      awayTeam,
    };
  }

  private async resolveSingleTeam(
    teamId?: string,
    teamInput?: CreateMatchDto['homeTeam'],
    fallbackTeamId?: string,
  ) {
    if (teamId) {
      return this.teamsService.findTeamOrFail(teamId);
    }

    if (teamInput) {
      return this.teamsService.findOrCreateTeam(teamInput);
    }

    if (fallbackTeamId) {
      return this.teamsService.findTeamOrFail(fallbackTeamId);
    }

    throw new BadRequestException(
      'Each match must define home and away teams.',
    );
  }

  private async resolveSingleTeamForLookup(
    teamId?: string,
    teamInput?: CreateMatchDto['homeTeam'],
  ) {
    if (teamId) {
      return this.teamsService.findTeamOrFail(teamId);
    }

    if (teamInput) {
      const existingTeam = await this.teamsService.findReusableTeamByInput(
        teamInput,
      );

      if (existingTeam) {
        return existingTeam;
      }

      return {
        id: `missing:${teamInput.name.trim()}:${teamInput.shortName.trim()}`,
      };
    }

    throw new BadRequestException(
      'Each match must define home and away teams.',
    );
  }

  private async ensureNoDuplicateMatch(
    matchInput: {
      externalId: string | null;
      homeTeamId: string;
      awayTeamId: string;
      matchDate: Date;
    },
    excludedMatchId?: string,
  ) {
    const existingMatch = await this.findDuplicateMatch(matchInput);

    if (existingMatch && existingMatch.id !== excludedMatchId) {
      throw new ConflictException('Match already exists.');
    }
  }

  private async findDuplicateMatch(matchInput: {
    externalId: string | null;
    homeTeamId: string;
    awayTeamId: string;
    matchDate: Date;
  }) {
    if (matchInput.externalId) {
      const existingMatchByExternalId = await this.matchesRepository.findOne({
        where: { externalId: matchInput.externalId },
      });

      if (existingMatchByExternalId) {
        return existingMatchByExternalId;
      }
    }

    return this.matchesRepository.findOne({
      where: {
        homeTeamId: matchInput.homeTeamId,
        awayTeamId: matchInput.awayTeamId,
        matchDate: matchInput.matchDate,
      },
    });
  }
}
