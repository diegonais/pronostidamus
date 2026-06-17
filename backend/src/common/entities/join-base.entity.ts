import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export abstract class JoinBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({
    type: 'timestamptz',
  })
  createdAt: Date;
}
