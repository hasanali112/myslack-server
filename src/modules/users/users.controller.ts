import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CloudinaryService } from './cloudinary.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MarkMessagesReadDto } from './dto/mark-messages-read.dto';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('avatar')
  @ApiOperation({ summary: 'Update user avatar' })
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Avatar updated successfully')
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const currentUserId = req.user.sub;
    const uploadResult = await this.cloudinaryService.uploadFile(file);
    return this.usersService.updateCurrentUser(currentUserId, {
      avatar: uploadResult.secure_url,
    });
  }

  @Get('search')
  @ApiOperation({ summary: 'Search for users by name or username' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Returns a list of matched users' })
  @ResponseMessage('Users found successfully')
  async searchUsers(@Query('q') q: string, @Request() req) {
    const currentUserId = req.user.sub;
    return this.usersService.searchUsers(q, currentUserId);
  }

  @Get('all')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get all registered users except current user' })
  @ApiResponse({ status: 200, description: 'Returns all users' })
  @ResponseMessage('Users fetched successfully')
  async getAllUsers(@Request() req) {
    const currentUserId = req.user.sub;
    return this.usersService.getAllUsers(currentUserId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns current user profile' })
  @ResponseMessage('User profile fetched successfully')
  async getCurrentUser(@Request() req) {
    const currentUserId = req.user.sub;
    return this.usersService.getCurrentUser(currentUserId);
  }

  @Get('profile/:username')
  @ApiOperation({ summary: 'Get user profile by username' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  @ResponseMessage('User profile fetched successfully')
  async getUserProfile(@Param('username') username: string) {
    return this.usersService.getUserProfileByUsername(username);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updates current user profile' })
  @ResponseMessage('User profile updated successfully')
  async updateCurrentUser(@Request() req, @Body() body: UpdateProfileDto) {
    const currentUserId = req.user.sub;
    const sanitize = (value?: string) => {
      if (value === undefined) return undefined;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    return this.usersService.updateCurrentUser(currentUserId, {
      fullName: sanitize(body.fullName),
      role: sanitize(body.role),
      bio: sanitize(body.bio),
      phone: sanitize(body.phone),
      location: sanitize(body.location),
    });
  }

  @Get('community-stats')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get community dashboard stats for current user' })
  @ApiResponse({ status: 200, description: 'Returns dashboard stats' })
  @ResponseMessage('Community stats fetched successfully')
  async getCommunityStats(@Request() req) {
    const currentUserId = req.user.sub;
    return this.usersService.getCommunityStats(currentUserId);
  }

  @Post('message-reads')
  @ApiOperation({ summary: 'Mark messages as read for current user' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  @ResponseMessage('Messages marked as read')
  async markMessagesRead(@Request() req, @Body() body: MarkMessagesReadDto) {
    const currentUserId = req.user.sub;
    return this.usersService.markMessagesRead(currentUserId, body.messageIds);
  }
}
