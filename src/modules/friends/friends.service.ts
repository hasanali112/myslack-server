import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFriendRequestDto } from './dto/create-friend-request.dto';

@Injectable()
export class FriendsService {
  constructor(private readonly prisma: PrismaService) {}

  async sendFriendRequest(
    currentUserId: string,
    createFriendRequestDto: CreateFriendRequestDto,
  ) {
    const { receiverId } = createFriendRequestDto;

    if (currentUserId === receiverId) {
      throw new BadRequestException(
        'You cannot send a friend request to yourself',
      );
    }

    // Check if user exists
    const receiver = await this.prisma.user.findUnique({
      where: { user_id: receiverId },
    });
    if (!receiver) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: currentUserId, friendId: receiverId },
          { userId: receiverId, friendId: currentUserId },
        ],
      },
    });

    if (existingFriendship) {
      throw new ConflictException('You are already friends');
    }

    // Check if request already exists (either direction)
    const existingRequest = await this.prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: receiverId },
          { senderId: receiverId, receiverId: currentUserId },
        ],
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        throw new ConflictException(
          'A friend request already exists between you',
        );
      }

      if (existingRequest.senderId === currentUserId) {
        // Resend if rejected previously
        return this.prisma.friendRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'PENDING' },
        });
      }
    }

    return this.prisma.friendRequest.create({
      data: {
        senderId: currentUserId,
        receiverId,
      },
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        receiverId: userId,
        status: 'PENDING',
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
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSentRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: {
        senderId: userId,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            user_id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException(
        'You do not have permission to accept this request',
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Request is already ${request.status.toLowerCase()}`,
      );
    }

    return this.prisma.$transaction(async (prisma) => {
      // Update request status
      const updatedRequest = await prisma.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      // Create bidirectional friendships
      await prisma.friendship.createMany({
        data: [
          { userId: request.senderId, friendId: request.receiverId },
          { userId: request.receiverId, friendId: request.senderId },
        ],
        skipDuplicates: true,
      });

      return updatedRequest;
    });
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.receiverId !== userId) {
      throw new BadRequestException(
        'You do not have permission to reject this request',
      );
    }

    return this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.senderId !== userId) {
      throw new BadRequestException(
        'You do not have permission to cancel this request',
      );
    }

    return this.prisma.friendRequest.delete({
      where: { id: requestId },
    });
  }

  async getFriendsList(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            user_id: true,
            username: true,
            fullName: true,
            avatar: true,
            status: true,
          },
        },
      },
    });

    return friendships.map((f) => f.friend);
  }
}
