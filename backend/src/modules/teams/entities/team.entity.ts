import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Match } from '../../matches/entities/match.entity';

@Entity({ name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  shortName!: string;

  @Column({ type: 'varchar', nullable: true })
  countryCode!: string | null;

  @Column({ type: 'varchar', nullable: true })
  logoUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Match, (match) => match.homeTeam)
  homeMatches!: Match[];

  @OneToMany(() => Match, (match) => match.awayTeam)
  awayMatches!: Match[];
}
