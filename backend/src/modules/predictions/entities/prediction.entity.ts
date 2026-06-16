import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { Match } from '../../matches/entities/match.entity';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'predictions' })
@Unique('UQ_predictions_user_id_room_id_match_id', ['userId', 'roomId', 'matchId'])
@Check(
  'CHK_predictions_home_score_non_negative',
  '"predictedHomeScore" >= 0',
)
@Check(
  'CHK_predictions_away_score_non_negative',
  '"predictedAwayScore" >= 0',
)
@Check(
  'CHK_predictions_points_valid',
  '"points" IS NULL OR "points" IN (0, 1, 3)',
)
export class Prediction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  roomId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  matchId!: string;

  @Column({ type: 'integer' })
  predictedHomeScore!: number;

  @Column({ type: 'integer' })
  predictedAwayScore!: number;

  @Column({ type: 'integer', nullable: true })
  points!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Room, (room) => room.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room!: Room;

  @ManyToOne(() => User, (user) => user.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @ManyToOne(() => Match, (match) => match.predictions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'matchId' })
  match!: Match;
}
