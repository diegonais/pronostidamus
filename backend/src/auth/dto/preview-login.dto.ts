import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class PreviewLoginDto {
  @ApiProperty()
  @IsString()
  @Length(3, 50)
  username: string;

  @ApiProperty()
  @IsString()
  @Length(6, 128)
  password: string;
}
