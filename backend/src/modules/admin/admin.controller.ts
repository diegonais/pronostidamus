import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { TeamsService } from '../teams/teams.service';
import { CreateTeamDto } from '../teams/dto/create-team.dto';
import { UpdateTeamDto } from '../teams/dto/update-team.dto';
import { MatchesService } from '../matches/matches.service';
import { CreateMatchDto } from '../matches/dto/create-match.dto';
import { UpdateMatchDto } from '../matches/dto/update-match.dto';
import { UpdateMatchResultDto } from '../matches/dto/update-match-result.dto';
import { ScoringService } from '../scoring/scoring.service';

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
    private readonly teamsService: TeamsService,
    private readonly matchesService: MatchesService,
    private readonly scoringService: ScoringService,
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

  @Post('teams')
  createTeam(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.createTeam(createTeamDto);
  }

  @Patch('teams/:teamId')
  updateTeam(
    @Param('teamId') teamId: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(teamId, updateTeamDto);
  }

  @Post('matches')
  createMatch(@Body() createMatchDto: CreateMatchDto) {
    return this.matchesService.createMatch(createMatchDto);
  }

  @Patch('matches/:matchId')
  updateMatch(
    @Param('matchId') matchId: string,
    @Body() updateMatchDto: UpdateMatchDto,
  ) {
    return this.matchesService.updateMatch(matchId, updateMatchDto);
  }

  @Patch('matches/:matchId/result')
  updateMatchResult(
    @Param('matchId') matchId: string,
    @Body() updateMatchResultDto: UpdateMatchResultDto,
  ) {
    return this.matchesService.updateMatchResult(matchId, updateMatchResultDto);
  }

  @Post('matches/:matchId/calculate-points')
  calculateMatchPoints(@Param('matchId') matchId: string) {
    return this.scoringService.calculatePointsForMatch(matchId);
  }

  @Post('matches/calculate-points')
  calculateFinishedMatchesPoints() {
    return this.scoringService.calculatePointsForFinishedMatches();
  }

  @Post('matches/import')
  importMatches(
    @Body(new ParseArrayPipe({ items: CreateMatchDto }))
    createMatchDtos: CreateMatchDto[],
  ) {
    return this.matchesService.importMatches(createMatchDtos);
  }
}
