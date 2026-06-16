import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { RoomsService } from './rooms.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('rooms')
@UseGuards(JwtAuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('my')
  getMyRooms(@Req() request: AuthenticatedRequest) {
    return this.roomsService.getMyRooms(request.user.id);
  }

  @Get(':roomId')
  getRoomById(
    @Param('roomId') roomId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.roomsService.getRoomByIdForUser(roomId, request.user.id);
  }
}
