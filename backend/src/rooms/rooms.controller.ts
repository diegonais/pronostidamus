import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { Room } from './entities/room.entity';
import { RoomUser } from './entities/room-user.entity';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @ApiCreatedResponse({ type: Room })
  create(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.create(createRoomDto);
  }

  @Get()
  @ApiOkResponse({ type: Room, isArray: true })
  findAll() {
    return this.roomsService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: Room })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.roomsService.findOne(id);
  }

  @Patch(':id')
  @ApiOkResponse({ type: Room })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateRoomDto: UpdateRoomDto,
  ) {
    return this.roomsService.update(id, updateRoomDto);
  }

  @Delete(':id')
  @ApiOkResponse({
    schema: {
      example: { message: 'Room removed successfully' },
    },
  })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.roomsService.remove(id);
  }

  @Post(':roomId/users/:userId')
  @ApiCreatedResponse({ type: RoomUser })
  addUser(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.roomsService.addUser(roomId, userId);
  }

  @Delete(':roomId/users/:userId')
  @ApiOkResponse({
    schema: {
      example: { message: 'User removed from room successfully' },
    },
  })
  removeUser(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.roomsService.removeUser(roomId, userId);
  }
}
