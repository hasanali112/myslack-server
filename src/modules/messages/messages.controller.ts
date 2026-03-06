import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { AuthGuard } from '../../common/guards/auth.guard';

@Controller('messages')
@UseGuards(AuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('history/:friendId')
  async getHistory(@Req() req: any, @Param('friendId') friendId: string) {
    return this.messagesService.getChatHistory(req.user.sub, friendId);
  }
}
