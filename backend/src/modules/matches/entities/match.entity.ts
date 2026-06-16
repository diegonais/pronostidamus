import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MatchStatus } from '../../../common/enums/match-status.enum';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { Team } from '../../teams/entities/team.entity';

@Entity({ name: 'matches' })
@Check('CHK_matches_home_team_away_team', '"homeTeamId" <> "awayTeamId"')
@Check(
  'CHK_matches_scores_non_negative',
  '"homeScore" IS NULL OR "homeScore" >= 0',
)
@Check(
  'CHK_matches_away_score_non_negative',
  '"awayScore" IS NULL OR "awayScore" >= 0',
)
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  externalId!: string | null;

  @Column({ type: 'uuid' })
  homeTeamId!: string;

  @Column({ type: 'uuid' })
  awayTeamId!: string;

  @Column({ type: 'varchar', nullable: true })
  groupName!: string | null;

  @Column({ type: 'varchar' })
  round!: string;

  @Column({ type: 'timestamptz' })
  matchDate!: Date;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.SCHEDULED,
  })
  status!: MatchStatus;

  @Column({ type: 'integer', nullable: true })
  homeScore!: number | null;

  @Column({ type: 'integer', nullable: true })
  awayScore!: number | null;

  @Column({ type: 'varchar', nullable: true })
  venue!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => Team, (team) => team.homeMatches, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'homeTeamId' })
  homeTeam!: Team;

  @ManyToOne(() => Team, (team) => team.awayMatches, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'awayTeamId' })
  awayTeam!: Team;

  @OneToMany(() => Prediction, (prediction) => prediction.match)
  predictions!: Prediction[];
}
