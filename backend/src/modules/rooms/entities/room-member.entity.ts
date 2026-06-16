import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';
import { Room } from './room.entity';

@Entity({ name: 'room_members' })
@Unique('UQ_room_members_room_id_user_id', ['roomId', 'userId'])
export class RoomMember {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  roomId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  joinedAt!: Date;

  @ManyToOne(() => Room, (room) => room.members, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room!: Room;

  @ManyToOne(() => User, (user) => user.roomMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user!: User;
}
