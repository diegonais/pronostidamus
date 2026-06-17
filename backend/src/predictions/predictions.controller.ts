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
import { CreatePredictionDto } from './dto/create-prediction.dto';
import { Prediction } from './entities/prediction.entity';
import { PredictionsService } from './predictions.service';
import { UpdatePredictionDto } from './dto/update-prediction.dto';

@ApiTags('Predictions')
@Controller()
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post('matches/:matchId/predictions')
  @ApiCreatedResponse({ type: Prediction })
  create(
    @Param('matchId', new ParseUUIDPipe()) matchId: string,
    @Body() createPredictionDto: CreatePredictionDto,
  ) {
    return this.predictionsService.create(matchId, createPredictionDto);
  }

  @Get('matches/:matchId/predictions')
  @ApiOkResponse({ type: Prediction, isArray: true })
  findByMatch(@Param('matchId', new ParseUUIDPipe()) matchId: string) {
    return this.predictionsService.findByMatch(matchId);
  }

  @Get('predictions/:id')
  @ApiOkResponse({ type: Prediction })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.predictionsService.findOne(id);
  }

  @Patch('predictions/:id')
  @ApiOkResponse({ type: Prediction })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updatePredictionDto: UpdatePredictionDto,
  ) {
    return this.predictionsService.update(id, updatePredictionDto);
  }
}
