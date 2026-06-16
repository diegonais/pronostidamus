import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(32)
  shortName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  countryCode?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string | null;
}
