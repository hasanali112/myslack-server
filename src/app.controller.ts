import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Public()
  getHello() {
    return {
      status: 200,
      message: 'Welcome to Slack API',
    };
  }

  @Get('health')
  @Public()
  healthCheck() {
    return {
      status: 200,
      message: 'OK',
    };
  }
}
