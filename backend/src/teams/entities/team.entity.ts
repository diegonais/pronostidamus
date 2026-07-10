import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Match } from '../../matches/entities/match.entity';

@Entity({ name: 'teams' })
export class Team extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 40 })
  externalId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 80 })
  name: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 80 })
  nameEn: string;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 10, nullable: true })
  fifaCode: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 12, nullable: true })
  iso2: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 8, nullable: true })
  group: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'varchar', length: 255, nullable: true })
  flagUrl: string | null;

  @OneToMany(() => Match, (match) => match.teamAInfo)
  homeMatches: Match[];

  @OneToMany(() => Match, (match) => match.teamBInfo)
  awayMatches: Match[];
}
