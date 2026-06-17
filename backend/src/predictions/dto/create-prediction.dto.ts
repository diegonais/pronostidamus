import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class CreatePredictionDto {
  @ApiProperty({
    description:
      'UUID del usuario que realiza la prediccion en esta fase inicial.',
  })
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  predictedTeamAScore: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  predictedTeamBScore: number;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  points?: number | null;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isCalculated?: boolean;
}
