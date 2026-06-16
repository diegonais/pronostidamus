import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { UserRole } from '../../../common/enums/user-role.enum';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { RoomMember } from '../../rooms/entities/room-member.entity';
import { Room } from '../../rooms/entities/room.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  username!: string;

  @Column({ type: 'varchar' })
  passwordHash!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    array: true,
    default: [UserRole.USER],
  })
  roles!: UserRole[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Room, (room) => room.createdByUser)
  createdRooms!: Room[];

  @OneToMany(() => RoomMember, (roomMember) => roomMember.user)
  roomMemberships!: RoomMember[];

  @OneToMany(() => Prediction, (prediction) => prediction.user)
  predictions!: Prediction[];
}
