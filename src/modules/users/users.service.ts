import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async searchUsers(query: string, currentUserId: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();

    // Find users where username or fullName contains the search term, excluding the current user
    const users = await this.prismaService.user.findMany({
      where: {
        AND: [
          {
            user_id: {
              not: currentUserId,
            },
          },
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { fullName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        avatar: true,
        status: true,
      },
      take: 20, // Limit results
    });

    return users;
  }

  async getUserProfileByUsername(username: string) {
    return this.prismaService.user.findUnique({
      where: { username },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        bio: true,
        role: true,
        location: true,
        avatar: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async getCurrentUser(currentUserId: string) {
    return this.prismaService.user.findUnique({
      where: { user_id: currentUserId },
      select: {
        user_id: true,
        username: true,
        fullName: true,
        bio: true,
        role: true,
        phone: true,
        location: true,
        avatar: true,
        status: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async updateCurrentUser(currentUserId: string, payload: {
    fullName?: string | null;
    role?: string | null;
    bio?: string | null;
    phone?: string | null;
    location?: string | null;
  }) {
    return this.prismaService.user.update({
      where: { user_id: currentUserId },
      data: payload,
      select: {
        user_id: true,
        username: true,
        fullName: true,
        bio: true,
        role: true,
        phone: true,
        location: true,
        avatar: true,
        status: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async getCommunityStats(currentUserId: string) {
    const channelMemberships = await this.prismaService.channelMember.findMany({
      where: { user_id: currentUserId },
      select: { channel_id: true },
    });
    const channelIds = channelMemberships.map((item) => item.channel_id);

    const [pendingRequests, connections, unreadMessages] = await Promise.all([
      this.prismaService.friendRequest.count({
        where: { receiverId: currentUserId, status: 'PENDING' },
      }),
      this.prismaService.friendship.count({
        where: { userId: currentUserId },
      }),
      channelIds.length === 0
        ? Promise.resolve(0)
        : this.prismaService.message.count({
            where: {
              channel_id: { in: channelIds },
              sender_id: { not: currentUserId },
              reads: {
                none: {
                  user_id: currentUserId,
                },
              },
            },
          }),
    ]);

    return {
      newMessages: unreadMessages,
      pendingRequests,
      connections,
    };
  }

  async markMessagesRead(currentUserId: string, messageIds: string[]) {
    if (!messageIds.length) return { marked: 0 };

    const channelMemberships = await this.prismaService.channelMember.findMany({
      where: { user_id: currentUserId },
      select: { channel_id: true },
    });
    const channelIds = channelMemberships.map((item) => item.channel_id);
    if (channelIds.length === 0) return { marked: 0 };

    const allowedMessages = await this.prismaService.message.findMany({
      where: {
        message_id: { in: messageIds },
        channel_id: { in: channelIds },
      },
      select: { message_id: true },
    });
    const allowedIds = allowedMessages.map((item) => item.message_id);
    if (allowedIds.length === 0) return { marked: 0 };

    const result = await this.prismaService.messageRead.createMany({
      data: allowedIds.map((messageId) => ({
        user_id: currentUserId,
        message_id: messageId,
      })),
      skipDuplicates: true,
    });

    return { marked: result.count };
  }
}
