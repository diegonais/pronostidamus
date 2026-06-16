import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { Team } from './entities/team.entity';

export interface TeamLookupInput {
  name: string;
  shortName: string;
  countryCode?: string | null;
  logoUrl?: string | null;
}

@Injectable()
export class TeamsService {
  constructor(
    @InjectRepository(Team)
    private readonly teamsRepository: Repository<Team>,
  ) {}

  async createTeam(createTeamDto: CreateTeamDto) {
    await this.ensureNoDuplicateTeam(createTeamDto);

    const team = this.teamsRepository.create({
      name: createTeamDto.name.trim(),
      shortName: createTeamDto.shortName.trim(),
      countryCode: createTeamDto.countryCode?.trim() || null,
      logoUrl: createTeamDto.logoUrl?.trim() || null,
    });

    const savedTeam = await this.teamsRepository.save(team);

    return this.toTeamResponse(savedTeam);
  }

  async updateTeam(teamId: string, updateTeamDto: UpdateTeamDto) {
    const team = await this.findTeamOrFail(teamId);

    const nextTeam = {
      name: updateTeamDto.name?.trim() ?? team.name,
      shortName: updateTeamDto.shortName?.trim() ?? team.shortName,
      countryCode:
        updateTeamDto.countryCode === undefined
          ? team.countryCode
          : updateTeamDto.countryCode?.trim() || null,
      logoUrl:
        updateTeamDto.logoUrl === undefined
          ? team.logoUrl
          : updateTeamDto.logoUrl?.trim() || null,
    };

    await this.ensureNoDuplicateTeam(nextTeam, team.id);

    team.name = nextTeam.name;
    team.shortName = nextTeam.shortName;
    team.countryCode = nextTeam.countryCode;
    team.logoUrl = nextTeam.logoUrl;

    const savedTeam = await this.teamsRepository.save(team);

    return this.toTeamResponse(savedTeam);
  }

  async findTeamOrFail(teamId: string) {
    const team = await this.teamsRepository.findOne({
      where: { id: teamId },
    });

    if (!team) {
      throw new NotFoundException('Team not found.');
    }

    return team;
  }

  async findOrCreateTeam(teamInput: TeamLookupInput) {
    const existingTeam = await this.findReusableTeam(teamInput);

    if (existingTeam) {
      return existingTeam;
    }

    const team = this.teamsRepository.create({
      name: teamInput.name.trim(),
      shortName: teamInput.shortName.trim(),
      countryCode: teamInput.countryCode?.trim() || null,
      logoUrl: teamInput.logoUrl?.trim() || null,
    });

    return this.teamsRepository.save(team);
  }

  findReusableTeamByInput(teamInput: TeamLookupInput) {
    return this.findReusableTeam(teamInput);
  }

  toTeamResponse(team: Team) {
    return {
      id: team.id,
      name: team.name,
      shortName: team.shortName,
      countryCode: team.countryCode,
      logoUrl: team.logoUrl,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  private async findReusableTeam(teamInput: TeamLookupInput) {
    const trimmedCountryCode = teamInput.countryCode?.trim();

    if (trimmedCountryCode) {
      const teamByCountryCode = await this.teamsRepository.findOne({
        where: { countryCode: trimmedCountryCode },
      });

      if (teamByCountryCode) {
        return teamByCountryCode;
      }
    }

    const trimmedName = teamInput.name.trim();

    return this.teamsRepository.findOne({
      where: { name: trimmedName },
    });
  }

  private async ensureNoDuplicateTeam(
    teamInput: Omit<TeamLookupInput, 'logoUrl'> & { logoUrl?: string | null },
    excludedTeamId?: string,
  ) {
    const existingTeam = await this.findReusableTeam(teamInput);

    if (existingTeam && existingTeam.id !== excludedTeamId) {
      throw new ConflictException('Team already exists.');
    }
  }
}
