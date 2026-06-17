import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { MatchStatus } from '../../common/enums/match-status.enum';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { Room } from '../../rooms/entities/room.entity';

@Entity({ name: 'matches' })
export class Match extends BaseEntity {
  @Column({ type: 'uuid' })
  roomId: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 80 })
  teamA: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 80 })
  teamB: string;

  @ApiProperty({
    example: '2026-06-18T20:00:00-04:00',
    description:
      'Enviar en formato ISO 8601. La referencia de negocio es America/La_Paz.',
  })
  @Column({ type: 'timestamptz' })
  matchDate: Date;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'int', nullable: true })
  teamAScore: number | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'int', nullable: true })
  teamBScore: number | null;

  @ApiProperty({ enum: MatchStatus, enumName: 'MatchStatus' })
  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.SCHEDULED,
  })
  status: MatchStatus;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Room, (room) => room.matches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @OneToMany(() => Prediction, (prediction) => prediction.match)
  predictions: Prediction[];
}
