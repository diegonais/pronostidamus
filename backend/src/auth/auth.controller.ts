import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { PreviewLoginDto } from './dto/preview-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  @ApiOkResponse({
    schema: {
      example: {
        module: 'AuthModule',
        phase: 'preview',
        authentication: 'pending',
      },
    },
  })
  status() {
    return {
      module: 'AuthModule',
      phase: 'preview',
      authentication: 'pending',
    };
  }

  @Post('preview-login')
  previewLogin(@Body() previewLoginDto: PreviewLoginDto) {
    return this.authService.previewLogin(previewLoginDto);
  }
}
