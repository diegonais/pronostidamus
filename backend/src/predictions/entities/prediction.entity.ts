import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Match } from '../../matches/entities/match.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'predictions' })
@Unique('UQ_predictions_user_match', ['userId', 'matchId'])
export class Prediction extends BaseEntity {
  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  matchId: string;

  @ApiProperty()
  @Column({ type: 'int' })
  predictedTeamAScore: number;

  @ApiProperty()
  @Column({ type: 'int' })
  predictedTeamBScore: number;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'int', nullable: true })
  points: number | null;

  @ApiProperty()
  @Column({ type: 'boolean', default: false })
  isCalculated: boolean;

  @ManyToOne(() => User, (user) => user.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Match, (match) => match.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'matchId' })
  match: Match;
}
