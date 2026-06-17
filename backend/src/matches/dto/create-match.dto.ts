import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { IsDifferentFrom } from '../../common/validators/is-different-from.validator';

export class CreateMatchDto {
  @ApiProperty()
  @IsString()
  @Length(1, 80)
  teamA: string;

  @ApiProperty()
  @IsString()
  @Length(1, 80)
  @IsDifferentFrom('teamA', {
    message: 'teamB must be different from teamA',
  })
  teamB: string;

  @ApiProperty({
    example: '2026-06-18T20:00:00-04:00',
  })
  @IsDateString()
  matchDate: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  teamAScore?: number | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  teamBScore?: number | null;

  @ApiProperty({
    required: false,
    enum: MatchStatus,
    enumName: 'MatchStatus',
    default: MatchStatus.SCHEDULED,
  })
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
