import { IsInt, Min } from 'class-validator';

export class UpdatePredictionDto {
  @IsInt()
  @Min(0)
  predictedHomeScore!: number;

  @IsInt()
  @Min(0)
  predictedAwayScore!: number;
}
