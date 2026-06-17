import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'pronostidamus-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
