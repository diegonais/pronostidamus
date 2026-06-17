import { Entity, JoinColumn, ManyToOne, Unique, Column } from 'typeorm';
import { JoinBaseEntity } from '../../common/entities/join-base.entity';
import { User } from '../../users/entities/user.entity';
import { Room } from './room.entity';

@Entity({ name: 'room_users' })
@Unique('UQ_room_users_room_user', ['roomId', 'userId'])
export class RoomUser extends JoinBaseEntity {
  @Column({ type: 'uuid' })
  roomId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Room, (room) => room.roomUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => User, (user) => user.roomUsers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;
}
