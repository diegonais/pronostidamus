import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Prediction } from '../../predictions/entities/prediction.entity';
import { User } from '../../users/entities/user.entity';
import { RoomMember } from './room-member.entity';

@Entity({ name: 'rooms' })
export class Room {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar', unique: true })
  code!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid' })
  createdByUserId!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.createdRooms, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser!: User;

  @OneToMany(() => RoomMember, (roomMember) => roomMember.room)
  members!: RoomMember[];

  @OneToMany(() => Prediction, (prediction) => prediction.room)
  predictions!: Prediction[];
}
