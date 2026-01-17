import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators/public.decorator';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Welcome message' })
  @ApiResponse({
    status: 200,
    description: 'Returns a welcome message',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'Welcome to Slack API' },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  getHello() {
    return {
      status: 200,
      message: 'Welcome to Slack API',
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'Returns the health status of the API',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', example: 200 },
        message: { type: 'string', example: 'OK' },
      },
    },
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  healthCheck() {
    return {
      status: 200,
      message: 'OK',
    };
  }
}
