import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { MatchStatus } from '../../../common/enums/match-status.enum';
import { MatchTeamInputDto } from './match-team-input.dto';

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  externalId?: string | null;

  @IsOptional()
  @IsUUID()
  homeTeamId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchTeamInputDto)
  homeTeam?: MatchTeamInputDto;

  @IsOptional()
  @IsUUID()
  awayTeamId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MatchTeamInputDto)
  awayTeam?: MatchTeamInputDto;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  round?: string;

  @IsOptional()
  @IsDateString()
  matchDate?: string;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  venue?: string | null;
}
