import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Match } from '../../matches/entities/match.entity';
import { RoomUser } from './room-user.entity';

@Entity({ name: 'rooms' })
export class Room extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => RoomUser, (roomUser) => roomUser.room, {
    cascade: false,
  })
  roomUsers: RoomUser[];

  @OneToMany(() => Match, (match) => match.room)
  matches: Match[];
}
