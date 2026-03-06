import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';
import { ResponseMessage } from 'src/common/decorators/response-message.decorator';

@ApiTags('Friends')
@ApiBearerAuth()
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: 'Send a friend request' })
  @ApiResponse({ status: 201, description: 'Request sent successfully' })
  @ResponseMessage('Friend request sent')
  async sendRequest(@Request() req, @Body() createDto: CreateFriendRequestDto) {
    return this.friendsService.sendFriendRequest(req.user.sub, createDto);
  }

  @Get('requests/pending')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get pending incoming friend requests' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of pending incoming requests',
  })
  @ResponseMessage('Pending friend requests fetched')
  async getPendingRequests(@Request() req) {
    return this.friendsService.getPendingRequests(req.user.sub);
  }

  @Get('requests/sent')
  @SkipThrottle()
  @ApiOperation({ summary: 'Get sent friend requests' })
  @ApiResponse({ status: 200, description: 'Returns list of sent requests' })
  @ResponseMessage('Sent friend requests fetched')
  async getSentRequests(@Request() req) {
    return this.friendsService.getSentRequests(req.user.sub);
  }

  @Post('request/:id/accept')
  @ApiOperation({ summary: 'Accept a friend request' })
  @ApiResponse({ status: 200, description: 'Request accepted successfully' })
  @ResponseMessage('Friend request accepted')
  async acceptRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.acceptFriendRequest(req.user.sub, id);
  }

  @Post('request/:id/reject')
  @ApiOperation({ summary: 'Reject a friend request' })
  @ApiResponse({ status: 200, description: 'Request rejected' })
  @ResponseMessage('Friend request rejected')
  async rejectRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.rejectFriendRequest(req.user.sub, id);
  }

  @Delete('request/:id/cancel')
  @ApiOperation({ summary: 'Cancel a sent friend request' })
  @ApiResponse({ status: 200, description: 'Request cancelled' })
  @ResponseMessage('Friend request cancelled')
  async cancelRequest(@Request() req, @Param('id') id: string) {
    return this.friendsService.cancelFriendRequest(req.user.sub, id);
  }

  @Get()
  @SkipThrottle()
  @ApiOperation({ summary: 'Get the friends list' })
  @ApiResponse({ status: 200, description: "Returns the user's friends" })
  @ResponseMessage('Friends list fetched')
  async getFriendsList(@Request() req) {
    return this.friendsService.getFriendsList(req.user.sub);
  }
}
