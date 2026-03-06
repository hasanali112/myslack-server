import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search for users by name or username' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Returns a list of matched users' })
  @ResponseMessage('Users found successfully')
  async searchUsers(@Query('q') q: string, @Request() req) {
    const currentUserId = req.user.sub;
    return this.usersService.searchUsers(q, currentUserId);
  }
}
