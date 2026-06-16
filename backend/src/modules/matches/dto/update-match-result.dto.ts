import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { MatchStatus } from '../../../common/enums/match-status.enum';

export class UpdateMatchResultDto {
  @IsInt()
  @Min(0)
  homeScore!: number;

  @IsInt()
  @Min(0)
  awayScore!: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
