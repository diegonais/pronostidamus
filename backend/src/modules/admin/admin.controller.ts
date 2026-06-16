import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';

import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from '../users/users.service';
import { CreateRoomDto } from '../rooms/dto/create-room.dto';
import { AddRoomMemberDto } from '../rooms/dto/add-room-member.dto';
import { RoomsService } from '../rooms/rooms.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly roomsService: RoomsService,
  ) {}

  @Get('users')
  async getUsers() {
    const users = await this.usersService.findAll();

    return users.map((user) => this.usersService.toAdminUserResponse(user));
  }

  @Patch('users/:userId')
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUserByAdmin(userId, updateUserDto);

    return this.usersService.toAdminUserResponse(user);
  }

  @Patch('users/:userId/enable')
  async enableUser(@Param('userId') userId: string) {
    const user = await this.usersService.updateUserByAdmin(userId, {
      isActive: true,
    });

    return this.usersService.toAdminUserResponse(user);
  }

  @Patch('users/:userId/disable')
  async disableUser(@Param('userId') userId: string) {
    const user = await this.usersService.updateUserByAdmin(userId, {
      isActive: false,
    });

    return this.usersService.toAdminUserResponse(user);
  }

  @Post('rooms')
  createRoom(
    @Body() createRoomDto: CreateRoomDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.roomsService.createRoom(createRoomDto, request.user.id);
  }

  @Post('rooms/:roomId/members')
  addRoomMember(
    @Param('roomId') roomId: string,
    @Body() addRoomMemberDto: AddRoomMemberDto,
  ) {
    return this.roomsService.addMemberToRoom(roomId, addRoomMemberDto);
  }
}
