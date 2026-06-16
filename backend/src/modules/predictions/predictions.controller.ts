import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { UpdatePredictionDto } from './dto/update-prediction.dto';
import { PredictionsService } from './predictions.service';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('rooms/:roomId')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('predictions/my')
  getMyPredictions(
    @Param('roomId') roomId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.predictionsService.getMyPredictions(roomId, request.user.id);
  }

  @Get('matches/:matchId/prediction')
  getMyPredictionForMatch(
    @Param('roomId') roomId: string,
    @Param('matchId') matchId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.predictionsService.getMyPredictionForMatch(
      roomId,
      matchId,
      request.user.id,
    );
  }

  @Post('matches/:matchId/prediction')
  createPrediction(
    @Param('roomId') roomId: string,
    @Param('matchId') matchId: string,
    @Req() request: AuthenticatedRequest,
    @Body() createPredictionDto: CreatePredictionDto,
  ) {
    return this.predictionsService.createPrediction(
      roomId,
      matchId,
      request.user.id,
      createPredictionDto,
    );
  }

  @Patch('matches/:matchId/prediction')
  updatePrediction(
    @Param('roomId') roomId: string,
    @Param('matchId') matchId: string,
    @Req() request: AuthenticatedRequest,
    @Body() updatePredictionDto: UpdatePredictionDto,
  ) {
    return this.predictionsService.updatePrediction(
      roomId,
      matchId,
      request.user.id,
      updatePredictionDto,
    );
  }
}
