import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateMatchDto } from './dto/create-match.dto';
import { Match } from './entities/match.entity';
import { MatchesService } from './matches.service';
import { UpdateMatchDto } from './dto/update-match.dto';

@ApiTags('Matches')
@Controller()
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Post('rooms/:roomId/matches')
  @ApiCreatedResponse({ type: Match })
  create(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Body() createMatchDto: CreateMatchDto,
  ) {
    return this.matchesService.create(roomId, createMatchDto);
  }

  @Get('rooms/:roomId/matches')
  @ApiOkResponse({ type: Match, isArray: true })
  findByRoom(@Param('roomId', new ParseUUIDPipe()) roomId: string) {
    return this.matchesService.findByRoom(roomId);
  }

  @Get('matches/:id')
  @ApiOkResponse({ type: Match })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.matchesService.findOne(id);
  }

  @Patch('matches/:id')
  @ApiOkResponse({ type: Match })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateMatchDto: UpdateMatchDto,
  ) {
    return this.matchesService.update(id, updateMatchDto);
  }
}
