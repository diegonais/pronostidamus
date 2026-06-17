import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { Prediction } from '../../predictions/entities/prediction.entity';
import { RoomUser } from '../../rooms/entities/room-user.entity';

@Entity({ name: 'users' })
@Unique('UQ_users_email', ['email'])
@Unique('UQ_users_username', ['username'])
export class User extends BaseEntity {
  @ApiProperty()
  @Column({ type: 'varchar', length: 120 })
  name: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 150 })
  email: string;

  @ApiProperty()
  @Column({ type: 'varchar', length: 50 })
  username: string;

  @ApiHideProperty()
  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    select: false,
  })
  passwordHash: string | null;

  @ApiProperty({ enum: UserRole, enumName: 'UserRole' })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => RoomUser, (roomUser) => roomUser.user)
  roomUsers: RoomUser[];

  @OneToMany(() => Prediction, (prediction) => prediction.user)
  predictions: Prediction[];
}
