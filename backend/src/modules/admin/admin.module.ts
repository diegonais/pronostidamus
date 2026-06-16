import { Module } from '@nestjs/common';

import { RoomsModule } from '../rooms/rooms.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, RoomsModule],
  controllers: [AdminController],
})
export class AdminModule {}
