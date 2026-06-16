import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(120)
  code!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
