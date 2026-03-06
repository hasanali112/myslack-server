import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMessageDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateDMChannel(user1Id: string, user2Id: string) {
    if (!user1Id || !user2Id) {
      throw new BadRequestException(
        'Both user IDs are required for a DM channel',
      );
    }

    // Check if DM channel already exists
    const existingChannel = await this.prisma.channel.findFirst({
      where: {
        isDM: true,
        channelMembers: {
          every: {
            user_id: { in: [user1Id, user2Id] },
          },
        },
      },
      include: {
        channelMembers: true,
      },
    });

    // Need to ensure exactly these two are members if it's a DM
    const dmChannel =
      existingChannel?.channelMembers.length === 2 ? existingChannel : null;

    if (dmChannel) return dmChannel;

    // Create a new DM channel
    const channelName = `dm-${[user1Id, user2Id].sort().join('-')}`;
    return this.prisma.channel.create({
      data: {
        name: channelName,
        isDM: true,
        channelMembers: {
          create: [{ user_id: user1Id }, { user_id: user2Id }],
        },
      },
    });
  }

  async sendMessage(senderId: string, dto: CreateMessageDto) {
    const channel = await this.getOrCreateDMChannel(senderId, dto.receiverId);

    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        sender_id: senderId,
        channel_id: channel.channel_id,
      },
      include: {
        sender: {
          select: {
            user_id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...message,
      receiver_id: dto.receiverId,
    };
  }

  async getChatHistory(userId: string, friendId: string) {
    const channel = await this.getOrCreateDMChannel(userId, friendId);

    return this.prisma.message.findMany({
      where: {
        channel_id: channel.channel_id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        sender: {
          select: {
            user_id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });
  }
}
